// Data Storage
let members = JSON.parse(localStorage.getItem('gymMembers')) || [];
let attendance = JSON.parse(localStorage.getItem('gymAttendance')) || [];
let payments = JSON.parse(localStorage.getItem('gymPayments')) || [];
let checkinRecords = JSON.parse(localStorage.getItem('gymCheckinLogs')) || [];

// DOM Elements
const memberForm = document.getElementById('memberForm');
const memberList = document.getElementById('memberList');
const checkinForm = document.getElementById('checkinForm');
const checkinMemberSelect = document.getElementById('checkinMember');
const checkinLogsElement = document.getElementById('checkinLogs');
const attendanceList = document.getElementById('attendanceList');
const paymentForm = document.getElementById('paymentForm');
const paymentList = document.getElementById('paymentList');
const memberSearch = document.getElementById('memberSearch');
const currentDateElement = document.getElementById('currentDate');

// Dashboard Elements
const totalMembersElement = document.getElementById('totalMembers');
const activeTodayElement = document.getElementById('activeToday');
const monthlyRevenueElement = document.getElementById('monthlyRevenue');
const recentActivityLogs = document.getElementById('recentActivityLogs');

// Charts
let attendanceChart;
let membershipChart;
let reportChart;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    renderMembers();
    renderCheckinLogs();
    renderAttendance();
    renderPayments();
    updateDashboard();
    populateMemberDropdowns();
    initCharts();
    setupEventListeners();
});

function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    // Member form submission
    if (memberForm) {
        memberForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addMember();
        });
    }

    // Check-in form submission
    if (checkinForm) {
        checkinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const action = e.submitter.value;
            if (action === 'checkin') {
                checkInMember();
            } else {
                checkOutMember();
            }
        });
    }

    // Payment form submission
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addPayment();
        });
    }

    // Member search
    if (memberSearch) {
        memberSearch.addEventListener('input', () => {
            renderMembers();
        });
    }
}

// Member Management
function addMember() {
    const newMember = {
        id: Date.now(),
        name: document.getElementById('memberName').value,
        email: document.getElementById('memberEmail').value,
        phone: document.getElementById('memberPhone').value,
        plan: document.getElementById('memberPlan').value,
        joinDate: document.getElementById('memberJoinDate').value,
        status: 'active'
    };
    
    members.push(newMember);
    saveToLocalStorage();
    renderMembers();
    populateMemberDropdowns();
    updateDashboard();
    memberForm.reset();
    addRecentActivity(`Added new member: ${newMember.name}`);
}

function renderMembers() {
    if (!memberList) return;
    
    const searchTerm = memberSearch.value.toLowerCase();
    const filteredMembers = members.filter(member => 
        member.name.toLowerCase().includes(searchTerm) ||
        member.phone.includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm)
    );
    
    memberList.innerHTML = filteredMembers.map(member => `
        <div class="card" data-id="${member.id}">
            <div>
                <h3>${member.name}</h3>
                <p>Phone: ${member.phone} | Email: ${member.email}</p>
                <p>Plan: ${formatPlan(member.plan)} | Joined: ${formatDate(member.joinDate)}</p>
            </div>
            <div>
                <button class="edit-btn" onclick="editMember(${member.id})">Edit</button>
                <button onclick="deleteMember(${member.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function editMember(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;
    
    document.getElementById('memberName').value = member.name;
    document.getElementById('memberEmail').value = member.email;
    document.getElementById('memberPhone').value = member.phone;
    document.getElementById('memberPlan').value = member.plan;
    document.getElementById('memberJoinDate').value = member.joinDate;
    
    members = members.filter(m => m.id !== id);
    saveToLocalStorage();
    renderMembers();
    populateMemberDropdowns();
    addRecentActivity(`Edited member: ${member.name}`);
}

function deleteMember(id) {
    if (confirm('Are you sure you want to delete this member?')) {
        const member = members.find(m => m.id === id);
        members = members.filter(m => m.id !== id);
        saveToLocalStorage();
        renderMembers();
        populateMemberDropdowns();
        updateDashboard();
        addRecentActivity(`Deleted member: ${member.name}`);
    }
}

// Check-In/Out System
function checkInMember() {
    const memberId = parseInt(checkinMemberSelect.value);
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const activeCheckin = checkinRecords.find(record => 
        record.memberId === memberId && 
        record.action === 'checkin' && 
        !record.checkoutTime
    );

    if (activeCheckin) {
        alert(`${member.name} is already checked in!`);
        return;
    }

    const now = new Date();
    const checkinRecord = {
        memberId: member.id,
        memberName: member.name,
        action: 'checkin',
        checkinTime: now.toISOString(),
        date: formatDate(now, 'YYYY-MM-DD'),
        checkoutTime: null
    };

    checkinRecords.push(checkinRecord);
    saveToLocalStorage();
    renderCheckinLogs();
    updateDashboard();
    addRecentActivity(`${member.name} checked in at ${formatTime(now)}`);
}

function checkOutMember() {
    const memberId = parseInt(checkinMemberSelect.value);
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const activeCheckin = checkinRecords.find(record => 
        record.memberId === memberId && 
        record.action === 'checkin' && 
        !record.checkoutTime
    );

    if (!activeCheckin) {
        alert(`${member.name} is not checked in!`);
        return;
    }

    const now = new Date();
    activeCheckin.checkoutTime = now.toISOString();
    activeCheckin.action = 'checkout';
    activeCheckin.duration = (new Date(now) - new Date(activeCheckin.checkinTime));

    attendance.push({
        memberId: member.id,
        memberName: member.name,
        date: formatDate(now, 'YYYY-MM-DD'),
        checkinTime: activeCheckin.checkinTime,
        checkoutTime: now.toISOString(),
        duration: activeCheckin.duration
    });

    saveToLocalStorage();
    renderCheckinLogs();
    updateDashboard();
    addRecentActivity(`${member.name} checked out at ${formatTime(now)}`);
}

function renderCheckinLogs() {
    if (!checkinLogsElement) return;
    
    const today = formatDate(new Date(), 'YYYY-MM-DD');
    const todayLogs = checkinRecords.filter(record => record.date === today)
        .sort((a, b) => new Date(b.checkinTime || b.checkoutTime) - new Date(a.checkinTime || a.checkoutTime));

    checkinLogsElement.innerHTML = todayLogs.map(record => `
        <div class="card">
            <div>
                <h3>${record.memberName}</h3>
                <p>${record.checkoutTime 
                    ? `Checked out at ${formatTime(record.checkoutTime)}` 
                    : `Checked in at ${formatTime(record.checkinTime)}`}</p>
                ${record.checkoutTime 
                    ? `<p>Duration: ${formatDuration(record.duration)}</p>` 
                    : '<span class="badge active">Currently in gym</span>'}
            </div>
        </div>
    `).join('');
}

// Attendance Management
function renderAttendance() {
    if (!attendanceList) return;
    
    attendanceList.innerHTML = attendance.map(record => `
        <div class="card">
            <div>
                <h3>${record.memberName}</h3>
                <p>Date: ${formatDate(record.date)}</p>
                <p>Check-in: ${formatTime(record.checkinTime)} | Check-out: ${record.checkoutTime ? formatTime(record.checkoutTime) : 'N/A'}</p>
                ${record.duration ? `<p>Duration: ${formatDuration(record.duration)}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function filterAttendance() {
    const dateFilter = document.getElementById('attendanceDateFilter').value;
    const memberFilter = document.getElementById('attendanceMemberFilter').value;

    let filtered = [...attendance];
    
    if (dateFilter) {
        filtered = filtered.filter(record => record.date === dateFilter);
    }
    
    if (memberFilter) {
        filtered = filtered.filter(record => record.memberId === parseInt(memberFilter));
    }

    attendanceList.innerHTML = filtered.map(record => `
        <div class="card">
            <div>
                <h3>${record.memberName}</h3>
                <p>Date: ${formatDate(record.date)}</p>
                <p>Check-in: ${formatTime(record.checkinTime)} | Check-out: ${record.checkoutTime ? formatTime(record.checkoutTime) : 'N/A'}</p>
            </div>
        </div>
    `).join('');
}

function resetAttendanceFilter() {
    document.getElementById('attendanceDateFilter').value = '';
    document.getElementById('attendanceMemberFilter').value = '';
    renderAttendance();
}

// Payment Management
function addPayment() {
    const memberId = parseInt(document.getElementById('paymentMember').value);
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    const newPayment = {
        id: Date.now(),
        memberId: member.id,
        memberName: member.name,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        date: document.getElementById('paymentDate').value,
        type: document.getElementById('paymentType').value
    };
    
    payments.push(newPayment);
    saveToLocalStorage();
    renderPayments();
    updateDashboard();
    paymentForm.reset();
    addRecentActivity(`Recorded payment of $${newPayment.amount} from ${member.name}`);
}

function renderPayments() {
    if (!paymentList) return;
    
    paymentList.innerHTML = payments.map(payment => `
        <div class="card">
            <div>
                <h3>${payment.memberName}</h3>
                <p>Amount: $${payment.amount.toFixed(2)} | Date: ${formatDate(payment.date)}</p>
                <p>Type: ${payment.type}</p>
            </div>
        </div>
    `).reverse().join('');
}

function filterPayments() {
    const monthFilter = document.getElementById('paymentMonthFilter').value;
    
    if (!monthFilter) {
        renderPayments();
        return;
    }
    
    const filtered = payments.filter(payment => 
        payment.date.startsWith(monthFilter)
    );

    paymentList.innerHTML = filtered.map(payment => `
        <div class="card">
            <div>
                <h3>${payment.memberName}</h3>
                <p>Amount: $${payment.amount.toFixed(2)} | Date: ${formatDate(payment.date)}</p>
                <p>Type: ${payment.type}</p>
            </div>
        </div>
    `).reverse().join('');
}

// Dashboard Functions
function updateDashboard() {
    if (totalMembersElement) totalMembersElement.textContent = members.length;
    
    const today = formatDate(new Date(), 'YYYY-MM-DD');
    const activeToday = checkinRecords.filter(record => 
        record.date === today && record.action === 'checkin' && !record.checkoutTime
    ).length;
    
    if (activeTodayElement) activeTodayElement.textContent = activeToday;
    
    const currentMonth = formatDate(new Date(), 'YYYY-MM');
    const monthlyRevenue = payments
        .filter(p => p.date.startsWith(currentMonth))
        .reduce((sum, p) => sum + p.amount, 0);
    
    if (monthlyRevenueElement) monthlyRevenueElement.textContent = `$${monthlyRevenue.toFixed(2)}`;
    
    updateRecentActivity();
    updateCharts();
}

function updateRecentActivity() {
    if (!recentActivityLogs) return;
    
    const recentActivities = [
        ...checkinRecords.map(record => ({
            time: record.checkinTime || record.checkoutTime,
            memberName: record.memberName,
            action: record.checkoutTime 
                ? `Checked out (${formatDuration(record.duration)})` 
                : 'Checked in'
        })),
        ...payments.map(p => ({
            time: p.date,
            memberName: p.memberName,
            action: `Payment: $${p.amount} (${p.type})`
        }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
    
    recentActivityLogs.innerHTML = recentActivities.map(activity => `
        <div class="card">
            <div>
                <h3>${activity.memberName}</h3>
                <p>${activity.action} on ${formatDate(activity.time)}</p>
            </div>
        </div>
    `).join('');
}

// Helper Functions
function populateMemberDropdowns() {
    const memberOptions = members.map(member => 
        `<option value="${member.id}">${member.name} (${member.phone})</option>`
    ).join('');
    
    if (checkinMemberSelect) checkinMemberSelect.innerHTML = `<option value="">Select Member</option>` + memberOptions;
    
    const paymentMemberSelect = document.getElementById('paymentMember');
    if (paymentMemberSelect) paymentMemberSelect.innerHTML = `<option value="">Select Member</option>` + memberOptions;
    
    const attendanceMemberFilter = document.getElementById('attendanceMemberFilter');
    if (attendanceMemberFilter) attendanceMemberFilter.innerHTML = `<option value="">All Members</option>` + memberOptions;
}

function formatDate(dateString, format = 'YYYY-MM-DD') {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    if (format === 'YYYY-MM-DD') {
        return date.toISOString().split('T')[0];
    }
    return date.toLocaleDateString();
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatPlan(plan) {
    const plans = {
        'basic': 'Basic ($30)',
        'standard': 'Standard ($50)',
        'premium': 'Premium ($80)'
    };
    return plans[plan] || plan;
}

function formatDuration(ms) {
    if (!ms) return "N/A";
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

function saveToLocalStorage() {
    localStorage.setItem('gymMembers', JSON.stringify(members));
    localStorage.setItem('gymAttendance', JSON.stringify(attendance));
    localStorage.setItem('gymPayments', JSON.stringify(payments));
    localStorage.setItem('gymCheckinLogs', JSON.stringify(checkinRecords));
}

// Chart Functions
function initCharts() {
    // Attendance Chart
    const attendanceCtx = document.getElementById('attendanceChart')?.getContext('2d');
    if (attendanceCtx) {
        attendanceChart = new Chart(attendanceCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Check-ins',
                    data: [12, 19, 15, 20, 18, 10, 8],
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Membership Chart
    const membershipCtx = document.getElementById('membershipChart')?.getContext('2d');
    if (membershipCtx) {
        membershipChart = new Chart(membershipCtx, {
            type: 'pie',
            data: {
                labels: ['Basic', 'Standard', 'Premium'],
                datasets: [{
                    data: [10, 15, 5],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    }
    
    // Report Chart
    const reportCtx = document.getElementById('reportChart')?.getContext('2d');
    if (reportCtx) {
        reportChart = new Chart(reportCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true
            }
        });
    }
}

function updateCharts() {
    // Update attendance chart with real data
    if (attendanceChart) {
        const last7Days = getLast7Days();
        const attendanceData = last7Days.map(day => {
            const dayLogs = checkinRecords.filter(log => log.date === day && log.action === 'checkin');
            return dayLogs.length;
        });
        
        attendanceChart.data.labels = last7Days.map(day => formatDate(day, 'ddd'));
        attendanceChart.data.datasets[0].data = attendanceData;
        attendanceChart.update();
    }
    
    // Update membership chart with real data
    if (membershipChart) {
        const basicCount = members.filter(m => m.plan === 'basic').length;
        const standardCount = members.filter(m => m.plan === 'standard').length;
        const premiumCount = members.filter(m => m.plan === 'premium').length;
        
        membershipChart.data.datasets[0].data = [basicCount, standardCount, premiumCount];
        membershipChart.update();
    }
}

function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(formatDate(date, 'YYYY-MM-DD'));
    }
    return dates;
}

// Tab Switching
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabElement = document.getElementById(tabName);
    if (tabElement) tabElement.classList.add('active');
    
    const button = document.querySelector(`button[onclick="openTab('${tabName}')"]`);
    if (button) button.classList.add('active');
    
    // Refresh data when switching to certain tabs
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'members':
            renderMembers();
            break;
        case 'checkin':
            renderCheckinLogs();
            break;
        case 'attendance':
            renderAttendance();
            break;
        case 'payments':
            renderPayments();
            break;
    }
}