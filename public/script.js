// script.js
// This file contains all the client-side logic for the WCM application.
// It communicates with the server.js backend to manage data.

document.addEventListener('DOMContentLoaded', function() {
    // --- STATE MANAGEMENT ---
    let allWorkers = [];
    let projects = [];
    let financeEntries = [];
    let leaveRequests = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    
    // For batch operations
    let workersForAssignment = [];
    let workersForAbsence = [];
    
    // For single item operations
    let selectedWorkerForRequest = null;
    let workerToArchiveAction = null;

    // Chart instances
    let workforceChart = null; 
    let areaChart = null;

    const API_URL = 'http://localhost:3004/api';

    // --- ELEMENT SELECTORS ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const volunteerTilesContainer = document.getElementById('volunteer-tiles-container');
    const paginationControls = document.getElementById('pagination-controls');
    const searchBar = document.getElementById('search-bar');
    const dashboardAbsenteesTable = document.getElementById('dashboard-absentees-table');
    const projectsList = document.getElementById('projects-list');
    const tradeTallyContainer = document.getElementById('trade-tally-container');
    const notificationsList = document.getElementById('notifications-list');
    
    // Forms & Modals
    const registrationFormContainer = document.getElementById('registration-form-container');
    const addWorkerBtn = document.getElementById('add-worker-btn');
    const cancelRegistrationBtn = document.getElementById('cancel-registration-btn');
    const registrationForm = document.getElementById('registration-form');
    const birthdayInput = document.getElementById('birthday-input');
    const ageOutput = document.getElementById('age-output');
    const photoDropZone = document.getElementById('photo-drop-zone');
    const photoFileInput = document.getElementById('photo-file-input');
    const photoPreviewContainer = document.getElementById('photo-preview-container');

    const importExcelBtn = document.getElementById('import-excel-btn');
    const excelModal = document.getElementById('excel-modal');
    const cancelImportBtn = document.getElementById('cancel-import-btn');
    const excelFileInput = document.getElementById('excel-file-input');
    const sheetSelection = document.getElementById('sheet-selection');
    const sheetSelector = document.getElementById('sheet-selector');
    const columnMapping = document.getElementById('column-mapping');
    const mappingFields = document.getElementById('mapping-fields');
    const processImportBtn = document.getElementById('process-import-btn');

    const archiveModal = document.getElementById('archive-modal');
    const archiveWorkerName = document.getElementById('archive-worker-name');
    const cancelArchiveBtn = document.getElementById('cancel-archive-btn');
    const confirmArchiveBtn = document.getElementById('confirm-archive-btn');
    
    const assignmentForm = document.getElementById('assignment-form');
    const assignmentWorkerSearch = document.getElementById('assignment-worker-search');
    const assignmentWorkerSuggestions = document.getElementById('assignment-worker-suggestions');
    const assignmentProjectSelect = document.getElementById('assignment-project-select');
    const assignmentAreaSelect = document.getElementById('assignment-area-select');
    const confirmAssignmentBtn = document.getElementById('confirm-assignment-btn');
    const assignmentsTable = document.getElementById('assignments-table');
    const absenceForm = document.getElementById('absence-form');
    const absenceWorkerSearch = document.getElementById('absence-worker-search');
    const absenceWorkerSuggestions = document.getElementById('absence-worker-suggestions');
    const confirmAbsenceBtn = document.getElementById('confirm-absence-btn');
    const assignmentListContainer = document.getElementById('assignment-list-container');
    const absenceListContainer = document.getElementById('absence-list-container');
    const assignmentProjectsList = document.getElementById('assignment-projects-list');

    const assignmentProjectInfoModal = document.getElementById('assignment-project-info-modal');
    const closeProjectInfoModalBtn = document.getElementById('close-project-info-modal-btn');
    const projectInfoName = document.getElementById('project-info-name');
    const projectInfoStatus = document.getElementById('project-info-status');
    const projectInfoArea = document.getElementById('project-info-area');
    const projectInfoStartDate = document.getElementById('project-info-start-date');
    const projectInfoTargetDate = document.getElementById('project-info-target-date');
    const projectInfoWorkersList = document.getElementById('project-info-workers-list');
    
    const createProjectBtn = document.getElementById('create-project-btn');
    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    const cancelProjectBtn = document.getElementById('cancel-project-btn');
    
    const editProjectModal = document.getElementById('edit-project-modal');
    const editProjectForm = document.getElementById('edit-project-form');
    const cancelEditProjectBtn = document.getElementById('cancel-edit-project-btn');

    const fundReceivedForm = document.getElementById('fund-received-form');
    const fundSpentForm = document.getElementById('fund-spent-form');
    const receivedHistoryTable = document.getElementById('received-history-table');
    const spentHistoryTable = document.getElementById('spent-history-table');
    const projectFundSummaryTable = document.getElementById('project-fund-summary-table');
    
    const editWorkerModal = document.getElementById('edit-worker-modal');
    const editWorkerForm = document.getElementById('edit-worker-form');
    const cancelEditWorkerBtn = document.getElementById('cancel-edit-worker-btn');
    const editPhotoDropZone = document.getElementById('edit-photo-drop-zone');
    const editPhotoFileInput = document.getElementById('edit-photo-file-input');
    const editPhotoPreviewContainer = document.getElementById('edit-photo-preview-container');

    const leaveRequestForm = document.getElementById('leave-request-form');
    const requestSearchInput = document.getElementById('request-search-input');
    const requestSuggestions = document.getElementById('request-suggestions');
    const leaveStartDate = document.getElementById('leave-start-date');
    const leaveEndDate = document.getElementById('leave-end-date');
    const leaveTotalDays = document.getElementById('leave-total-days');
    const leaveReason = document.getElementById('leave-reason');
    const submitLeaveRequestBtn = document.getElementById('submit-leave-request-btn');
    const leaveRequestsTable = document.getElementById('leave-requests-table');

    const workerInfoModal = document.getElementById('worker-info-modal');
    const closeInfoModalBtn = document.getElementById('close-info-modal-btn');
    
    let workbook;
    let selectedSheetName;
    const requiredFields = ['FullName', 'AssignedNumber', 'Birthday', 'WeddingAnniversary', 'ContactNumber', 'Address', 'MaritalStatus', 'MedicalCondition', 'EmergencyContactPerson', 'EmergencyContactNumber', 'LocalCongregation', 'Trade'];

    // --- API HELPER ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${API_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            // For DELETE requests, there might not be a JSON body to parse
            if (method === 'DELETE' && response.status === 204) {
                return;
            }
            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            alert(`An error occurred: ${error.message}`);
            throw error;
        }
    }

    // --- DATA FETCHING ---
    async function loadInitialData() {
        try {
            const data = await apiRequest('/data');
            allWorkers = data.workers || [];
            projects = data.projects || [];
            financeEntries = data.finance_entries || [];
            leaveRequests = data.leave_requests || [];
            renderAll();
        } catch (error) {
            // Error is already logged by apiRequest
        }
    }

    // --- HELPER FUNCTIONS ---
    function resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    function formatToISODate(dateValue) {
        if (!dateValue) return null;
        // Handles dates from MySQL (YYYY-MM-DDTHH:mm:ss.sssZ) and Excel (number)
        let date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        // Adjust for timezone offset to get the correct local date
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return date.toISOString().split('T')[0];
    }
    
    function calculateAgeFromBirthday(birthDateString) {
        const isoDate = formatToISODate(birthDateString);
        if (!isoDate) return 'N/A';
        
        const birthDate = new Date(isoDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
        return `${age} years old`;
    }

    function formatCurrency(num) {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num || 0);
    }

    // --- RENDER LOGIC ---
    function renderAll() {
        renderWorkerTiles();
        renderProjectsList();
        renderFinance();
        renderNotifications();
        updateDashboard();
        renderAssignmentTab();
        renderRequestsList();
        updateWorkforceChart(); 
        updateAreaChart();
    }

    function renderWorkerTiles() {
        const searchTerm = searchBar.value.toLowerCase();
        const filteredWorkers = allWorkers.filter(worker => 
            (worker.FullName && worker.FullName.toLowerCase().includes(searchTerm)) || 
            (worker.AssignedNumber && String(worker.AssignedNumber).toLowerCase().includes(searchTerm))
        );
        displayPaginatedTiles(filteredWorkers);
        setupPagination(filteredWorkers);
        renderTradeTally();
    }

    function displayPaginatedTiles(workers) {
        volunteerTilesContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = workers.slice(startIndex, endIndex);

        if (paginatedItems.length === 0) {
            volunteerTilesContainer.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">No workers found.</p>`;
            return;
        }
        
        const tradeBgColorMap = {
            'Carpenter': 'bg-amber-200', 'Electrician': 'bg-blue-200', 'Plumber': 'bg-sky-200',
            'Mason': 'bg-slate-300', 'Welder': 'bg-red-300', 'General Laborer': 'bg-green-200',
        };
        const tradeTextColorMap = {
            'Carpenter': 'text-amber-800', 'Electrician': 'text-blue-800', 'Plumber': 'text-sky-800',
            'Mason': 'text-slate-800', 'Welder': 'text-red-800', 'General Laborer': 'text-green-800',
        };

        paginatedItems.forEach(worker => {
            const tile = document.createElement('div');
            const bgColorClass = tradeBgColorMap[worker.Trade] || 'bg-gray-200';
            const textColorClass = tradeTextColorMap[worker.Trade] || 'text-gray-800';
            const age = calculateAgeFromBirthday(worker.Birthday);

            tile.className = `card volunteer-tile flex flex-col text-center overflow-hidden cursor-pointer`;
            tile.dataset.id = worker.id;

            tile.innerHTML = `
                <div class="p-3 ${bgColorClass} ${textColorClass}">
                    <p class="font-bold uppercase tracking-wider text-sm">${worker.Trade || 'N/A'}</p>
                </div>
                <div class="p-4 flex flex-col items-center text-center w-full">
                    <img src="${worker.Photo || 'https://placehold.co/100x100/E2E8F0/4A5568?text=Photo'}" alt="Worker Photo" class="w-24 h-24 rounded-lg object-cover bg-gray-300 border-4 border-white mb-4">
                    
                    <div class="w-full">
                        <h3 class="font-bold text-lg text-gray-900 truncate w-full" title="${worker.FullName || ''}">${worker.FullName || 'N/A'}</h3>
                        <p class="text-sm text-gray-500 mb-3">#${worker.AssignedNumber || 'N/A'}</p>
                        
                        <hr class="w-full my-2 border-t border-gray-200">
                        
                        <div class="text-left w-full grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
                            <div class="font-semibold text-gray-500">Age:</div>
                            <div class="text-gray-800">${age}</div>
                            
                            <div class="font-semibold text-gray-500">Area:</div>
                            <div class="text-gray-800 truncate" title="${worker.area || 'N/A'}">${worker.area || 'N/A'}</div>
                            
                            <div class="col-span-2 font-semibold text-gray-500">Medical:</div>
                            <div class="col-span-2 text-gray-800 text-xs truncate" title="${worker.MedicalCondition || 'None'}">
                                ${worker.MedicalCondition || 'None'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            volunteerTilesContainer.appendChild(tile);
        });
    }

    function setupPagination(workers) {
        paginationControls.innerHTML = '';
        const pageCount = Math.ceil(workers.length / itemsPerPage);
        if (pageCount <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.innerHTML = `<i class="fas fa-chevron-left"></i>`;
        prevButton.className = 'pagination-btn bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';
        prevButton.disabled = (currentPage === 1);
        prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderWorkerTiles(); } });
        paginationControls.appendChild(prevButton);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${pageCount}`;
        pageInfo.className = 'text-gray-700 text-sm sm:text-base font-medium';
        paginationControls.appendChild(pageInfo);

        const nextButton = document.createElement('button');
        nextButton.innerHTML = `<i class="fas fa-chevron-right"></i>`;
        nextButton.className = 'pagination-btn bg-white px-3 sm:px-4 py-2 rounded-lg shadow-sm border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';
        nextButton.disabled = (currentPage === pageCount);
        nextButton.addEventListener('click', () => { if (currentPage < pageCount) { currentPage++; renderWorkerTiles(); } });
        paginationControls.appendChild(nextButton);
    }

    function updateDashboard() {
        const presentCount = allWorkers.filter(w => w.attendance_status === 'present').length;
        document.getElementById('present-workers-count').textContent = presentCount;

        dashboardAbsenteesTable.innerHTML = '';
        const absentWorkers = allWorkers.filter(w => w.attendance_status === 'absent');
        if (absentWorkers.length === 0) {
            dashboardAbsenteesTable.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">No absentees today.</td></tr>';
        } else {
            absentWorkers.forEach(worker => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="p-4">${worker.FullName}</td>
                    <td class="p-4 text-gray-600">${worker.attendance_reason}</td>
                    <td class="p-4 text-right">
                        <button data-action="mark-present" data-id="${worker.id}" class="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded">Mark Present</button>
                    </td>
                `;
                dashboardAbsenteesTable.appendChild(row);
            });
        }
    }
    
    function renderTradeTally() {
        const tradeCounts = allWorkers.reduce((acc, worker) => {
            if (worker.Trade) {
                if (!acc[worker.Trade]) {
                    acc[worker.Trade] = { total: 0, present: 0 };
                }
                acc[worker.Trade].total++;
                if(worker.attendance_status === 'present') {
                   acc[worker.Trade].present++;
                }
            }
            return acc;
        }, {});

        tradeTallyContainer.innerHTML = '';
        const sortedTrades = Object.keys(tradeCounts).sort();

        const tradeColorMap = {
            'Carpenter': 'bg-amber-100 text-amber-800 border-amber-400',
            'Electrician': 'bg-blue-100 text-blue-800 border-blue-400',
            'Plumber': 'bg-sky-100 text-sky-800 border-sky-400',
            'Mason': 'bg-slate-200 text-slate-800 border-slate-400',
            'Welder': 'bg-red-100 text-red-800 border-red-400',
            'General Laborer': 'bg-green-100 text-green-800 border-green-400',
        };

        for (const trade of sortedTrades) {
            const { total, present } = tradeCounts[trade];
            const absent = total - present;
            const colorClass = tradeColorMap[trade] || 'bg-gray-100 text-gray-800 border-gray-400';

            const card = document.createElement('div');
            card.className = `card p-4 rounded-lg border-l-4 ${colorClass}`;
            card.innerHTML = `
                <p class="font-semibold">${trade}</p>
                <p class="text-2xl font-bold">${present}<span class="text-lg font-medium opacity-70">/${total}</span></p>
                ${absent > 0 ? `<p class="text-sm text-red-500">${absent} absent</p>` : `<p class="text-sm text-green-600">All present</p>`}
            `;
            tradeTallyContainer.appendChild(card);
        }
    }

    function renderNotifications() {
        notificationsList.innerHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const upcomingEvents = [];

        allWorkers.forEach(worker => {
            if (worker.Birthday) {
                const birthDate = new Date(formatToISODate(worker.Birthday));
                birthDate.setFullYear(today.getFullYear()); 
                if (birthDate >= today) upcomingEvents.push({ type: 'Birthday', date: birthDate, workerName: worker.FullName });
            }
            if (worker.WeddingAnniversary) {
                const anniversaryDate = new Date(formatToISODate(worker.WeddingAnniversary));
                anniversaryDate.setFullYear(today.getFullYear());
                if(anniversaryDate >= today) upcomingEvents.push({ type: 'Anniversary', date: anniversaryDate, workerName: worker.FullName});
            }
        });

        if (upcomingEvents.length === 0) {
            notificationsList.innerHTML = '<p class="text-gray-500">No upcoming events.</p>';
            return;
        }

        upcomingEvents.sort((a, b) => a.date - b.date).slice(0, 5).forEach(event => {
            const isToday = event.date.getTime() === today.getTime();
            const icon = event.type === 'Birthday' ? 'fas fa-birthday-cake' : 'fas fa-ring';
            const color = isToday ? 'blue' : 'gray';
            
            const notification = document.createElement('div');
            notification.className = `flex items-center p-3 bg-${color}-50 rounded-lg`;
            notification.innerHTML = `
                <i class="${icon} text-${color}-500 mr-4 fa-fw"></i>
                <div>
                    <p class="font-semibold">${event.workerName}'s ${event.type}</p>
                    <p class="text-sm text-gray-600">${isToday ? "Today!" : event.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                </div>
            `;
            notificationsList.appendChild(notification);
        });
    }

    function renderAssignmentTab() {
        const activeProjects = projects.filter(p => p.status === 'Active');
        assignmentProjectSelect.innerHTML = '<option value="">Select Project</option>' + 
            activeProjects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        assignmentAreaSelect.innerHTML = '<option value="">Select a project first</option>';
        assignmentAreaSelect.disabled = true;

        assignmentsTable.innerHTML = '';
        const projectMap = projects.reduce((map, p) => { map[p.id] = p.name; return map; }, {});
        const assignedWorkers = allWorkers.filter(w => w.projectId && w.projectId !== 'unassigned');

        if(assignedWorkers.length === 0) {
            assignmentsTable.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No workers are currently assigned to projects.</td></tr>';
            return;
        }

        assignedWorkers.forEach(worker => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-4">${worker.FullName || 'N/A'} (#${worker.AssignedNumber || 'N/A'})</td>
                <td class="p-4">${projectMap[worker.projectId] || 'Unknown Project'}</td>
                <td class="p-4">${worker.area || 'N/A'}</td>
                <td class="p-4">
                    <button data-action="unassign" data-id="${worker.id}" class="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1 rounded">Unassign</button>
                </td>
            `;
            assignmentsTable.appendChild(row);
        });

        renderAssignmentProjectsList();
    }

    function renderAssignmentProjectsList() {
        assignmentProjectsList.innerHTML = '';
        if (projects.length === 0) {
            assignmentProjectsList.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">No projects to display.</p>`;
            return;
        }
        
        projects.forEach(p => {
            const assignedWorkersCount = allWorkers.filter(w => w.projectId === p.id).length;
            const statusClasses = {
                Active: 'bg-green-100 text-green-800 border-green-500', 
                Paused: 'bg-yellow-100 text-yellow-800 border-yellow-500', 
                Canceled: 'bg-red-100 text-red-800 border-red-500',
            };
            const statusClass = statusClasses[p.status] || 'bg-gray-100 text-gray-800 border-gray-500';

            const card = document.createElement('div');
            card.className = `card p-5 cursor-pointer border-l-4 ${statusClass}`;
            card.dataset.projectId = p.id;
            card.innerHTML = `
                <div class="flex justify-between items-start">
                     <h3 class="font-bold text-lg text-gray-900 mb-3 pr-4">${p.name}</h3>
                     <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass.replace('border-l-4', '')}">${p.status}</span>
                </div>
                <div class="space-y-1 text-sm text-gray-600">
                     <p><i class="fas fa-map-marker-alt fa-fw mr-2 text-gray-400"></i>${p.area}</p>
                     <p class="font-semibold mt-2"><i class="fas fa-users fa-fw mr-2 text-blue-500"></i>${assignedWorkersCount} Worker(s) Assigned</p>
                </div>
            `;
            assignmentProjectsList.appendChild(card);
        });
    }

    function renderRequestsList() {
        leaveRequestsTable.innerHTML = '';
        if (leaveRequests.length === 0) {
            leaveRequestsTable.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No leave requests submitted.</td></tr>';
            return;
        }
        [...leaveRequests].forEach(req => {
            const statusClasses = {
                Pending: 'bg-yellow-100 text-yellow-800', Approved: 'bg-green-100 text-green-800', Rejected: 'bg-red-100 text-red-800',
            };
            const statusClass = statusClasses[req.status] || 'bg-gray-100 text-gray-800';
            const row = document.createElement('tr');

            let actionsHtml = '';
            if (req.status === 'Pending') {
                actionsHtml = `
                    <div class="flex space-x-2">
                        <button data-action="approve" data-id="${req.id}" class="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded">Approve</button>
                        <button data-action="reject" data-id="${req.id}" class="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded">Reject</button>
                    </div>
                `;
            }
            
            row.innerHTML = `
                <td class="p-4">${req.workerName}</td>
                <td class="p-4">${formatToISODate(req.startDate)} to ${formatToISODate(req.endDate)}</td>
                <td class="p-4 truncate max-w-xs" title="${req.reason}">${req.reason}</td>
                <td class="p-4"><span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusClass}">${req.status}</span></td>
                <td class="p-4">${actionsHtml}</td>
            `;
            leaveRequestsTable.appendChild(row);
        });
    }

    function renderProjectsList() {
        projectsList.innerHTML = '';
        if (projects.length === 0) {
            projectsList.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">No projects created yet.</p>`;
            return;
        }
        projects.forEach(p => {
            const assignedWorkersCount = allWorkers.filter(w => w.projectId === p.id).length;
            const statusClasses = {
                Active: 'bg-green-100 text-green-800', Paused: 'bg-yellow-100 text-yellow-800', Canceled: 'bg-red-100 text-red-800',
            };
            const statusClass = statusClasses[p.status] || 'bg-gray-100 text-gray-800';
            const card = document.createElement('div');
            card.className = 'card p-6 relative';
            card.innerHTML = `
                <div class="absolute top-4 right-4">
                    <button data-action="edit-project" data-id="${p.id}" class="text-gray-400 hover:text-blue-500 p-2 rounded-full"><i class="fas fa-pencil-alt"></i></button>
                </div>
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-xl text-gray-900 mb-4 pr-8">${p.name}</h3>
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusClass}">${p.status}</span>
                </div>
                <div class="space-y-2 text-gray-600">
                    <p><i class="fas fa-map-marker-alt fa-fw mr-2 text-gray-400"></i>${p.area}</p>
                    <p><i class="fas fa-play fa-fw mr-2 text-gray-400"></i>Started: ${formatToISODate(p.startDate)}</p>
                    <p><i class="fas fa-flag-checkered fa-fw mr-2 text-gray-400"></i>Target: ${formatToISODate(p.targetDate)}</p>
                    <p class="font-bold mt-2"><i class="fas fa-users fa-fw mr-2 text-blue-500"></i>${assignedWorkersCount} Workers Assigned</p>
                </div>
            `;
            projectsList.appendChild(card);
        });
    }

    function renderFinance() {
        const projectOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        document.getElementById('received-project').innerHTML = `<option value="">Select Project</option>${projectOptions}`;
        document.getElementById('spent-project').innerHTML = `<option value="">Select Project</option>${projectOptions}`;

        const receivedFunds = financeEntries.filter(f => f.type === 'received');
        const spentFunds = financeEntries.filter(f => f.type === 'spent');

        receivedHistoryTable.innerHTML = '';
        receivedFunds.forEach(f => {
            const projectName = projects.find(p => p.id === f.projectId)?.name || 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-4">${formatToISODate(f.date)}</td><td class="p-4">${projectName}</td><td class="p-4 text-right">${formatCurrency(f.amount)}</td>`;
            receivedHistoryTable.appendChild(row);
        });

        spentHistoryTable.innerHTML = '';
        spentFunds.forEach(f => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-4">${formatToISODate(f.date)}</td><td class="p-4">${f.description}</td><td class="p-4 text-right">${formatCurrency(f.amount)}</td>`;
            spentHistoryTable.appendChild(row);
        });

        projectFundSummaryTable.innerHTML = '';
        projects.forEach(p => {
            const totalFunds = p.totalFunds || 0;
            const spentFunds = p.spentFunds || 0;
            const remaining = totalFunds - spentFunds;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-4 font-medium">${p.name}</td>
                <td class="p-4 text-right text-green-600">${formatCurrency(totalFunds)}</td>
                <td class="p-4 text-right text-red-600">${formatCurrency(spentFunds)}</td>
                <td class="p-4 text-right font-semibold">${formatCurrency(remaining)}</td>
            `;
            projectFundSummaryTable.appendChild(row);
        });
    }

    // --- CHART LOGIC ---
    function initializeCharts() {
        const d_ctx = document.getElementById('workforce-chart').getContext('2d');
        workforceChart = new Chart(d_ctx, { 
            type: 'doughnut', 
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6', '#ff2d55'] }] }, 
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } 
        });

        const a_ctx = document.getElementById('area-chart').getContext('2d');
        areaChart = new Chart(a_ctx, { 
            type: 'pie', 
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#5856d6', '#ff9500', '#ff2d55', '#34c759', '#007aff', '#af52de', '#ff3b30' ] }] }, 
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } 
        });
    }
    
    function updateWorkforceChart() {
        if (!workforceChart) return;
        const tradeCounts = allWorkers.reduce((acc, worker) => {
            if (worker.Trade) {
                acc[worker.Trade] = (acc[worker.Trade] || 0) + 1;
            }
            return acc;
        }, {});

        const labels = Object.keys(tradeCounts);
        const data = Object.values(tradeCounts);
        
        workforceChart.data.labels = labels;
        workforceChart.data.datasets[0].data = data;
        workforceChart.update();
    }

    function updateAreaChart() {
        if (!areaChart) return;
        const areaCounts = allWorkers.reduce((acc, worker) => {
            const areaName = worker.area && worker.projectId !== 'unassigned' ? worker.area : 'Unassigned';
            acc[areaName] = (acc[areaName] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(areaCounts);
        const data = Object.values(areaCounts);
        
        areaChart.data.labels = labels;
        areaChart.data.datasets[0].data = data;
        areaChart.update();
    }

    // --- ACTION HANDLERS & FORM LOGIC ---
    async function handleRegisterWorker(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const workerData = Object.fromEntries(formData.entries());

        if (!workerData.FullName || !workerData.AssignedNumber) {
            alert('Full Name and Assigned Number are required.');
            return;
        }

        try {
            const newWorker = await apiRequest('/workers', 'POST', workerData);
            allWorkers.unshift(newWorker);
            registrationForm.reset();
            document.getElementById('photo-data-input').value = '';
            photoPreviewContainer.innerHTML = `<i class="fas fa-cloud-upload-alt text-4xl text-gray-400"></i><p class="text-gray-500 mt-2">Drag, paste, or click</p>`;
            registrationFormContainer.classList.add('hidden');
            renderAll();
        } catch (error) {
            // Error already handled by apiRequest
        }
    }

    function openEditModal(workerId) {
        const worker = allWorkers.find(w => w.id === workerId);
        if (!worker) return;

        for (const key in worker) {
            const input = editWorkerForm.querySelector(`[name="${key}"]`);
            if (input) {
                if(input.type === 'date') {
                   input.value = formatToISODate(worker[key]);
                } else {
                   input.value = worker[key];
                }
            }
        }
        
        editPhotoPreviewContainer.innerHTML = `<img src="${worker.Photo || 'https://placehold.co/100x100/E2E8F0/4A5568?text=Photo'}" alt="Photo preview" class="w-full h-full object-cover rounded-lg">`;
        document.getElementById('edit-photo-data-input').value = worker.Photo || '';
        editWorkerModal.classList.remove('hidden');
    }

    async function handleUpdateWorker(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedData = Object.fromEntries(formData.entries());
        const workerId = updatedData.id;

        try {
            const updatedWorker = await apiRequest(`/workers/${workerId}`, 'PUT', updatedData);
            const workerIndex = allWorkers.findIndex(w => w.id == workerId);
            if (workerIndex > -1) {
                allWorkers[workerIndex] = { ...allWorkers[workerIndex], ...updatedWorker };
            }
            editWorkerModal.classList.add('hidden');
            renderAll();
        } catch (error) {
            // Error already handled
        }
    }
    
    function calculateAge() { if (!birthdayInput.value) return; ageOutput.value = calculateAgeFromBirthday(birthdayInput.value); }
    
    async function handleFile(file, container, dataInput) {
        if (file && file.type.startsWith('image/')) {
            container.innerHTML = `<p class="text-gray-500 mt-4">Resizing photo...</p>`;
            try {
                const resizedDataUrl = await resizeImage(file);
                container.innerHTML = `<img src="${resizedDataUrl}" alt="Photo preview" class="w-full h-full object-cover rounded-lg">`;
                if (dataInput) {
                    dataInput.value = resizedDataUrl;
                }
            } catch (error) {
                console.error("Error resizing image:", error);
                container.innerHTML = `<p class="text-red-500 mt-4">Could not process image.</p>`;
            }
        }
    }

    function handleExcelFileSelect(e) { 
        const file = e.target.files[0]; 
        if (file) { 
            const reader = new FileReader(); 
            reader.onload = (event) => { 
                workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' }); 
                populateSheetSelector(workbook.SheetNames); 
                sheetSelection.classList.remove('hidden'); 
            }; 
            reader.readAsArrayBuffer(file); 
        } 
    }
    
    function handleSheetSelect() { 
        selectedSheetName = sheetSelector.value; 
        if (selectedSheetName) { 
            const headers = getSheetHeaders(workbook.Sheets[selectedSheetName]); 
            populateColumnMapping(headers); 
            columnMapping.classList.remove('hidden'); 
            processImportBtn.disabled = false; 
        } else { 
            columnMapping.classList.add('hidden'); 
            processImportBtn.disabled = true; 
        } 
    }
    
    async function processExcelImport() {
        const mapping = {};
        requiredFields.forEach(field => { const select = document.getElementById(`map-${field}`); if (select.value) mapping[field] = select.value; });
        const worksheet = workbook.Sheets[selectedSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);
        const headerIndexMap = {};
        Object.keys(mapping).forEach(key => { headerIndexMap[key] = headers.indexOf(mapping[key]); });
        
        const importedWorkers = dataRows.map(row => { 
            const worker = {}; 
            Object.keys(headerIndexMap).forEach(key => { 
                if (headerIndexMap[key] !== -1) {
                    let value = row[headerIndexMap[key]];
                    if ((key === 'Birthday' || key === 'WeddingAnniversary') && typeof value === 'number') {
                        worker[key] = formatToISODate(value);
                    } else {
                        worker[key] = value;
                    }
                }
            }); 
            return worker; 
        }).filter(worker => worker.FullName && worker.AssignedNumber);

        if (importedWorkers.length === 0) {
            alert("No valid workers with FullName and AssignedNumber found in the Excel file.");
            return;
        }

        // Import workers one by one
        let successCount = 0;
        let failCount = 0;
        for (const worker of importedWorkers) {
            try {
                const newWorker = await apiRequest('/workers', 'POST', worker);
                allWorkers.unshift(newWorker);
                successCount++;
            } catch (error) {
                failCount++;
                console.warn(`Could not import worker ${worker.FullName}: ${error.message}`);
            }
        }
        
        alert(`Import complete. ${successCount} workers imported successfully. ${failCount} workers failed (likely duplicates).`);
        renderAll();
        resetModal();
        excelModal.classList.add('hidden');
    }
    
    function populateSheetSelector(sheetNames) { 
        sheetSelector.innerHTML = '<option value="">Select a sheet</option>'; 
        sheetNames.forEach(name => { 
            const option = document.createElement('option'); 
            option.value = name; 
            option.textContent = name; 
            sheetSelector.appendChild(option); 
        }); 
    }
    
    function getSheetHeaders(worksheet) { 
        const headers = []; 
        const range = XLSX.utils.decode_range(worksheet['!ref']); 
        for (let C = range.s.c; C <= range.e.c; ++C) { 
            const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })]; 
            if (cell && cell.v) headers.push(cell.v); 
        } 
        return headers; 
    }
    
    function populateColumnMapping(headers) { 
        mappingFields.innerHTML = ''; 
        requiredFields.forEach(field => { 
            const fieldContainer = document.createElement('div'); 
            const label = document.createElement('label'); 
            label.textContent = field.replace(/([A-Z])/g, ' $1').trim(); 
            label.className = "block text-gray-700 font-semibold text-sm"; 
            const select = document.createElement('select'); 
            select.id = `map-${field}`; 
            select.className = "form-input w-full p-2 mt-1"; 
            select.innerHTML = '<option value="">-- Not in Excel --</option>'; 
            headers.forEach(header => { 
                const option = document.createElement('option'); 
                option.value = header; 
                option.textContent = header; 
                select.appendChild(option); 
            }); 
            fieldContainer.appendChild(label); 
            fieldContainer.appendChild(select); 
            mappingFields.appendChild(fieldContainer); 
        }); 
    }
    
    function resetModal() { 
        excelFileInput.value = ''; 
        sheetSelection.classList.add('hidden'); 
        columnMapping.classList.add('hidden'); 
        processImportBtn.disabled = true; 
        workbook = null; 
        selectedSheetName = null; 
    }

    function handleTabSwitch(e) {
        e.preventDefault();
        const tabId = this.dataset.tab;
        tabLinks.forEach(l => l.classList.remove('active-tab'));
        this.classList.add('active-tab');
        tabContents.forEach(content => { content.id === tabId ? content.classList.remove('hidden') : content.classList.add('hidden'); });
        if (sidebar.classList.contains('show')) sidebar.classList.remove('show');
    }
    
    async function handleDashboardAbsenteeAction(e) {
        const target = e.target.closest('[data-action="mark-present"]');
        if (!target) return;
        const workerId = target.dataset.id;
        try {
            const updatedWorker = await apiRequest(`/workers/${workerId}`, 'PUT', {
                attendance_status: 'present',
                attendance_reason: ''
            });
            const workerIndex = allWorkers.findIndex(w => w.id == workerId);
            if (workerIndex > -1) {
                allWorkers[workerIndex] = { ...allWorkers[workerIndex], ...updatedWorker };
                renderAll();
            }
        } catch (error) {
            // error handled
        }
    }

    function handleTileClick(e) {
        const target = e.target.closest('.volunteer-tile');
        if (!target) return;
        openWorkerInfoModal(target.dataset.id);
    }
    
    async function executeArchive() {
        const reasonEl = document.querySelector('input[name="archive-reason"]:checked');
        if (!reasonEl || !workerToArchiveAction) return;
        const reason = reasonEl.value;
        const workerId = workerToArchiveAction.id;

        try {
            await apiRequest(`/workers/archive/${workerId}`, 'POST', { archiveReason: reason });
            allWorkers = allWorkers.filter(w => w.id !== workerId);
            archiveModal.classList.add('hidden');
            workerToArchiveAction = null;
            renderAll();
        } catch (error) {
            // error handled
        }
    }

    // --- ASSIGNMENT & REQUESTS LOGIC (BATCH OPERATIONS) ---
    function populateAreaDropdown() {
        const projectId = assignmentProjectSelect.value;
        assignmentAreaSelect.innerHTML = '';
        
        if (projectId) {
            const project = projects.find(p => p.id === projectId);
            if (project && project.area) {
                const areas = project.area.split(',').map(a => a.trim()).filter(a => a);
                if (areas.length > 0) {
                    assignmentAreaSelect.innerHTML = '<option value="">Select an Area</option>';
                    areas.forEach(area => {
                        const option = document.createElement('option');
                        option.value = area;
                        option.textContent = area;
                        assignmentAreaSelect.appendChild(option);
                    });
                    assignmentAreaSelect.disabled = false;
                } else {
                    assignmentAreaSelect.innerHTML = '<option value="">No areas defined</option>';
                    assignmentAreaSelect.disabled = true;
                }
            } else {
                assignmentAreaSelect.innerHTML = '<option value="">No areas defined</option>';
                assignmentAreaSelect.disabled = true;
            }
        } else {
            assignmentAreaSelect.innerHTML = '<option value="">Select a project first</option>';
            assignmentAreaSelect.disabled = true;
        }
        checkAssignmentForm();
    }

    function checkAssignmentForm() {
        confirmAssignmentBtn.disabled = !(workersForAssignment.length > 0 && assignmentProjectSelect.value && assignmentAreaSelect.value);
    }

    function checkAbsenceForm() {
        const allReasonsProvided = workersForAbsence.every(worker => {
            const reasonInput = absenceListContainer.querySelector(`[data-reason-for="${worker.id}"]`);
            return reasonInput && reasonInput.value.trim() !== '';
        });
        confirmAbsenceBtn.disabled = !(workersForAbsence.length > 0 && allReasonsProvided);
    }

    function renderWorkerList(container, workerArray, type) {
        container.innerHTML = '';
        if (workerArray.length > 0 && (type === 'assignment')) {
            const header = document.createElement('div');
            header.className = 'text-sm font-semibold text-gray-600 mb-2';
            header.textContent = `Selected Workers (${workerArray.length}/10):`;
            container.appendChild(header);
        }

        workerArray.forEach(worker => {
            const item = document.createElement('div');
            if (type === 'assignment') {
                item.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
                item.innerHTML = `
                    <span class="text-sm font-medium">${worker.FullName}</span>
                    <button type="button" data-id="${worker.id}" data-action="remove-${type}" class="text-red-500 hover:text-red-700">&times;</button>
                `;
            } else if (type === 'absence') {
                item.className = 'bg-gray-50 p-3 rounded-lg border';
                item.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium">${worker.FullName}</span>
                        <button type="button" data-id="${worker.id}" data-action="remove-${type}" class="text-red-500 hover:text-red-700 text-lg">&times;</button>
                    </div>
                    <input type="text" data-reason-for="${worker.id}" class="form-input w-full p-2 text-sm" placeholder="Reason for absence..." required>
                `;
                item.querySelector('input').addEventListener('input', checkAbsenceForm);
            }
            container.appendChild(item);
        });
    }
    
    function handleWorkerSearch(e, type) {
        const query = e.target.value.toLowerCase();
        let suggestionsContainer, workerPool, currentList;

        if (type === 'assignment') {
            suggestionsContainer = assignmentWorkerSuggestions;
            currentList = workersForAssignment;
            workerPool = allWorkers.filter(w => w.projectId === 'unassigned' && !currentList.find(s => s.id === w.id));
        } else if (type === 'absence') {
            suggestionsContainer = absenceWorkerSuggestions;
            currentList = workersForAbsence;
            workerPool = allWorkers.filter(w => w.attendance_status === 'present' && !currentList.find(s => s.id === w.id));
        } else if (type === 'request') {
            suggestionsContainer = requestSuggestions;
            workerPool = allWorkers;
        }

        suggestionsContainer.innerHTML = '';
        if (query.length < 1 || (currentList && currentList.length >= 10)) {
            suggestionsContainer.classList.add('hidden');
            return;
        }

        const filteredWorkers = workerPool.filter(w => {
            const nameMatch = w.FullName && w.FullName.toLowerCase().includes(query);
            const numberMatch = w.AssignedNumber && String(w.AssignedNumber).toLowerCase().includes(query);
            return nameMatch || numberMatch;
        }).slice(0, 5);

        if (filteredWorkers.length > 0) {
            filteredWorkers.forEach(worker => {
                const item = document.createElement('div');
                item.className = 'p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center';
                item.dataset.workerId = worker.id;
                item.innerHTML = `
                    <span class="font-medium text-gray-800">${worker.FullName}</span>
                    <span class="text-sm text-gray-500">${worker.AssignedNumber}</span>`;
                item.addEventListener('click', () => handleSuggestionClick(worker, type));
                suggestionsContainer.appendChild(item);
            });
            suggestionsContainer.classList.remove('hidden');
        } else {
            suggestionsContainer.classList.add('hidden');
        }
    }

    function handleSuggestionClick(worker, type) {
        if (type === 'assignment') {
            if (workersForAssignment.length < 10) {
                workersForAssignment.push(worker);
                renderWorkerList(assignmentListContainer, workersForAssignment, 'assignment');
            }
            assignmentWorkerSearch.value = '';
            assignmentWorkerSuggestions.classList.add('hidden');
            checkAssignmentForm();
        } else if (type === 'absence') {
            if (workersForAbsence.length < 10) {
                workersForAbsence.push(worker);
                renderWorkerList(absenceListContainer, workersForAbsence, 'absence');
            }
            absenceWorkerSearch.value = '';
            absenceWorkerSuggestions.classList.add('hidden');
            checkAbsenceForm();
        } else if (type === 'request') {
            selectedWorkerForRequest = worker;
            requestSearchInput.value = worker.FullName;
            requestSuggestions.classList.add('hidden');
            checkLeaveRequestForm();
        }
    }

    async function submitAssignment(e) {
        e.preventDefault();
        if (workersForAssignment.length === 0) return;

        const projectId = assignmentProjectSelect.value;
        const area = assignmentAreaSelect.value;
        const workerIds = workersForAssignment.map(w => w.id);

        try {
            await apiRequest('/workers/assign', 'POST', { workerIds, projectId, area });
            
            // Update local state
            workerIds.forEach(id => {
                const worker = allWorkers.find(w => w.id === id);
                if (worker) {
                    worker.projectId = projectId;
                    worker.area = area;
                }
            });

            assignmentForm.reset();
            workersForAssignment = [];
            renderWorkerList(assignmentListContainer, workersForAssignment, 'assignment');
            populateAreaDropdown();
            checkAssignmentForm();
            renderAll();
        } catch (error) {
            // error handled
        }
    }

    async function submitAbsence(e) {
        e.preventDefault();
        if (workersForAbsence.length === 0) return;

        const workersToUpdate = workersForAbsence.map(worker => {
            const reasonInput = absenceListContainer.querySelector(`[data-reason-for="${worker.id}"]`);
            return {
                id: worker.id,
                reason: reasonInput ? reasonInput.value.trim() : 'No reason provided'
            };
        });

        try {
            await apiRequest('/workers/absent', 'POST', { workers: workersToUpdate });
            
            // Update local state
            workersToUpdate.forEach(update => {
                const worker = allWorkers.find(w => w.id === update.id);
                if (worker) {
                    worker.attendance_status = 'absent';
                    worker.attendance_reason = update.reason;
                }
            });

            absenceForm.reset();
            workersForAbsence = [];
            renderWorkerList(absenceListContainer, workersForAbsence, 'absence');
            checkAbsenceForm();
            renderAll();
        } catch (error) {
            // error handled
        }
    }
    
    async function handleAssignmentTableActions(e) {
        const target = e.target.closest('[data-action="unassign"]');
        if (!target) return;

        const workerId = target.dataset.id;
        try {
            const updatedWorker = await apiRequest(`/workers/${workerId}`, 'PUT', {
                projectId: 'unassigned',
                area: null
            });
            const workerIndex = allWorkers.findIndex(w => w.id == workerId);
            if (workerIndex > -1) {
                allWorkers[workerIndex] = { ...allWorkers[workerIndex], ...updatedWorker };
                renderAll();
            }
        } catch (error) {
            // error handled
        }
    }

    function handleBatchListRemove(e) {
         const button = e.target.closest('button[data-action]');
         if (!button) return;

         const workerId = button.dataset.id;
         if (button.dataset.action === 'remove-assignment') {
            workersForAssignment = workersForAssignment.filter(w => w.id != workerId);
            renderWorkerList(assignmentListContainer, workersForAssignment, 'assignment');
            checkAssignmentForm();
         } else if (button.dataset.action === 'remove-absence') {
            workersForAbsence = workersForAbsence.filter(w => w.id != workerId);
            renderWorkerList(absenceListContainer, workersForAbsence, 'absence');
            checkAbsenceForm();
         }
    }
    
    function calculateLeaveDays() {
        const start = new Date(leaveStartDate.value);
        const end = new Date(leaveEndDate.value);
        if (leaveStartDate.value && leaveEndDate.value && end >= start) {
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            leaveTotalDays.value = diffDays;
        } else {
            leaveTotalDays.value = '';
        }
        checkLeaveRequestForm();
    }

    function checkLeaveRequestForm() {
        const isValid = selectedWorkerForRequest && leaveStartDate.value && leaveEndDate.value && new Date(leaveEndDate.value) >= new Date(leaveStartDate.value) && leaveReason.value.trim();
        submitLeaveRequestBtn.disabled = !isValid;
    }

    async function handleLeaveRequestSubmit(e) {
        e.preventDefault();
        if (!selectedWorkerForRequest) return;
        
        const newRequest = {
            id: generateUUID(),
            workerId: selectedWorkerForRequest.id,
            workerName: selectedWorkerForRequest.FullName,
            startDate: leaveStartDate.value,
            endDate: leaveEndDate.value,
            totalDays: leaveTotalDays.value,
            reason: leaveReason.value,
            status: 'Pending'
        };

        try {
            const createdRequest = await apiRequest('/leave', 'POST', newRequest);
            leaveRequests.unshift(createdRequest);
            leaveRequestForm.reset();
            selectedWorkerForRequest = null;
            checkLeaveRequestForm();
            renderAll();
        } catch (error) {
            // error handled
        }
    }
    
    async function handleLeaveRequestAction(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const requestId = target.dataset.id;
        const status = (action === 'approve') ? 'Approved' : 'Rejected';

        if (action === 'approve' || action === 'reject') {
            try {
                await apiRequest(`/leave/${requestId}`, 'PUT', { status });
                const request = leaveRequests.find(r => r.id === requestId);
                if (request) {
                    request.status = status;
                }
                renderAll();
            } catch (error) {
                // error handled
            }
        }
    }
    
    // --- PROJECT & WORKER INFO MODAL LOGIC ---
    function openWorkerInfoModal(workerId) {
        const worker = allWorkers.find(w => w.id == workerId);
        if (!worker) return;

        document.getElementById('info-Photo').src = worker.Photo || 'https://placehold.co/100x100/E2E8F0/4A5568?text=Photo';
        document.getElementById('info-FullName').textContent = worker.FullName || 'N/A';
        document.getElementById('info-AssignedNumber').textContent = worker.AssignedNumber || 'N/A';
        document.getElementById('info-Trade').textContent = worker.Trade || 'N/A';
        document.getElementById('info-ContactNumber').textContent = worker.ContactNumber || 'N/A';
        document.getElementById('info-Birthday').textContent = worker.Birthday ? `${formatToISODate(worker.Birthday)} (${calculateAgeFromBirthday(worker.Birthday)})` : 'N/A';
        document.getElementById('info-Address').textContent = worker.Address || 'N/A';
        document.getElementById('info-MaritalStatus').textContent = worker.MaritalStatus || 'N/A';
        document.getElementById('info-LocalCongregation').textContent = worker.LocalCongregation || 'N/A';
        document.getElementById('info-MedicalCondition').textContent = worker.MedicalCondition || 'None';
        document.getElementById('info-EmergencyContactPerson').textContent = worker.EmergencyContactPerson || 'N/A';
        document.getElementById('info-EmergencyContactNumber').textContent = worker.EmergencyContactNumber || 'N/A';
        
        const editBtn = document.getElementById('info-edit-btn');
        const archiveBtn = document.getElementById('info-archive-btn');
        editBtn.dataset.id = workerId;
        archiveBtn.dataset.id = workerId;

        workerInfoModal.classList.remove('hidden');
    }

    function openAssignmentProjectInfoModal(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        projectInfoName.textContent = project.name;
        projectInfoArea.textContent = project.area;
        projectInfoStartDate.textContent = formatToISODate(project.startDate);
        projectInfoTargetDate.textContent = formatToISODate(project.targetDate);
        
        const statusClasses = {
            Active: 'bg-green-100 text-green-800', Paused: 'bg-yellow-100 text-yellow-800', Canceled: 'bg-red-100 text-red-800',
        };
        const statusClass = statusClasses[project.status] || 'bg-gray-100 text-gray-800';
        projectInfoStatus.innerHTML = `<span class="text-sm font-semibold px-3 py-1 rounded-full ${statusClass}">${project.status}</span>`;

        const assignedWorkers = allWorkers.filter(w => w.projectId === projectId);
        projectInfoWorkersList.innerHTML = '';
        if (assignedWorkers.length > 0) {
            assignedWorkers.forEach(worker => {
                const item = document.createElement('div');
                item.className = 'flex justify-between items-center bg-gray-50 p-2 rounded';
                item.innerHTML = `
                    <div>
                        <p class="font-medium">${worker.FullName}</p>
                        <p class="text-xs text-gray-500">${worker.Trade} - Area: ${worker.area}</p>
                    </div>
                    <p class="text-sm text-gray-600">#${worker.AssignedNumber}</p>
                `;
                projectInfoWorkersList.appendChild(item);
            });
        } else {
            projectInfoWorkersList.innerHTML = '<p class="text-gray-500">No workers currently assigned to this project.</p>';
        }
        
        assignmentProjectInfoModal.classList.remove('hidden');
    }
    
    function handleProjectActions(e) {
         const target = e.target.closest('[data-action="edit-project"]');
         if (!target) return;
         openEditProjectModal(target.dataset.id);
    }

    function openEditProjectModal(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-project-name').value = project.name;
        document.getElementById('edit-project-area').value = project.area;
        document.getElementById('edit-project-start-date').value = formatToISODate(project.startDate);
        document.getElementById('edit-project-target-date').value = formatToISODate(project.targetDate);
        document.getElementById('edit-project-status').value = project.status;

        editProjectModal.classList.remove('hidden');
    }

    async function handleUpdateProject(e) {
        e.preventDefault();
        const projectId = document.getElementById('edit-project-id').value;
        const updatedProjectData = {
            name: document.getElementById('edit-project-name').value,
            area: document.getElementById('edit-project-area').value,
            startDate: document.getElementById('edit-project-start-date').value,
            targetDate: document.getElementById('edit-project-target-date').value,
            status: document.getElementById('edit-project-status').value
        };

        try {
            const updatedProject = await apiRequest(`/projects/${projectId}`, 'PUT', updatedProjectData);
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex > -1) {
                projects[projectIndex] = { ...projects[projectIndex], ...updatedProject };
            }
            editProjectModal.classList.add('hidden');
            renderAll();
        } catch(error) {
            // error handled
        }
    }

    async function handleCreateProject(e) {
        e.preventDefault();
        const newProject = {
            id: generateUUID(),
            name: document.getElementById('project-name').value,
            area: document.getElementById('project-area').value,
            startDate: document.getElementById('project-start-date').value,
            targetDate: document.getElementById('project-target-date').value,
            status: document.getElementById('project-status').value
        };

        if (!newProject.name || !newProject.area || !newProject.startDate || !newProject.targetDate || !newProject.status) return;

        try {
            const createdProject = await apiRequest('/projects', 'POST', newProject);
            projects.push(createdProject);
            projectForm.reset();
            projectModal.classList.add('hidden');
            renderAll();
        } catch (error) {
            // error handled
        }
    }
    
    async function handleFundReceived(e) {
        e.preventDefault();
        const newEntry = {
            type: 'received',
            date: document.getElementById('received-date').value,
            projectId: document.getElementById('received-project').value,
            amount: parseFloat(document.getElementById('received-amount').value)
        };
        if (!newEntry.date || !newEntry.projectId || !newEntry.amount) return;
        
        try {
            const createdEntry = await apiRequest('/finance', 'POST', newEntry);
            financeEntries.push(createdEntry);
            
            // We need to refetch projects to get updated fund totals
            const updatedProjects = await apiRequest('/projects');
            projects = updatedProjects;

            fundReceivedForm.reset();
            renderAll();
        } catch (error) {
            // error handled
        }
    }

    async function handleFundSpent(e) {
        e.preventDefault();
        const newEntry = {
            type: 'spent',
            date: document.getElementById('spent-date').value,
            projectId: document.getElementById('spent-project').value,
            supplier: document.getElementById('spent-supplier').value,
            description: document.getElementById('spent-description').value,
            amount: parseFloat(document.getElementById('spent-amount').value)
        };
        if (!newEntry.date || !newEntry.projectId || !newEntry.description || !newEntry.amount) return;

        try {
            const createdEntry = await apiRequest('/finance', 'POST', newEntry);
            financeEntries.push(createdEntry);

            // We need to refetch projects to get updated fund totals
            const updatedProjects = await apiRequest('/projects');
            projects = updatedProjects;

            fundSpentForm.reset();
            renderAll();
        } catch (error) {
            // error handled
        }
    }

    // --- INITIALIZATION AND EVENT LISTENERS ---
    mobileMenuButton.addEventListener('click', () => sidebar.classList.toggle('show'));
    searchBar.addEventListener('input', () => { currentPage = 1; renderWorkerTiles(); });
    tabLinks.forEach(link => link.addEventListener('click', handleTabSwitch));
    birthdayInput.addEventListener('change', calculateAge);
    registrationForm.addEventListener('submit', handleRegisterWorker);
    addWorkerBtn.addEventListener('click', () => registrationFormContainer.classList.remove('hidden'));
    cancelRegistrationBtn.addEventListener('click', () => {
        registrationFormContainer.classList.add('hidden');
        registrationForm.reset();
        photoPreviewContainer.innerHTML = `<i class="fas fa-cloud-upload-alt text-4xl text-gray-400"></i><p class="text-gray-500 mt-2">Drag, paste, or click</p>`;
    });
    
    const regPhotoDataInput = document.getElementById('photo-data-input');
    photoDropZone.addEventListener('click', () => photoFileInput.click());
    photoDropZone.addEventListener('dragover', (e) => { e.preventDefault(); photoDropZone.classList.add('bg-blue-50'); });
    photoDropZone.addEventListener('dragleave', () => photoDropZone.classList.remove('bg-blue-50'));
    photoDropZone.addEventListener('drop', (e) => { e.preventDefault(); photoDropZone.classList.remove('bg-blue-50'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], photoPreviewContainer, regPhotoDataInput); });
    photoFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0], photoPreviewContainer, regPhotoDataInput); });
    
    document.addEventListener('paste', (e) => { 
        const isRegFormActive = !registrationFormContainer.classList.contains('hidden');
        const isEditFormActive = !editWorkerModal.classList.contains('hidden');
        if (!isRegFormActive && !isEditFormActive) return;
        
        const targetContainer = isEditFormActive ? editPhotoPreviewContainer : photoPreviewContainer;
        const targetDataInput = isEditFormActive ? document.getElementById('edit-photo-data-input') : regPhotoDataInput;

        const items = e.clipboardData.items; 
        for (let i = 0; i < items.length; i++) { 
            if (items[i].type.indexOf('image') !== -1) { 
                handleFile(items[i].getAsFile(), targetContainer, targetDataInput); 
                break; 
            } 
        } 
    });

    const editPhotoDataInput = document.getElementById('edit-photo-data-input');
    editPhotoDropZone.addEventListener('click', () => editPhotoFileInput.click());
    editPhotoDropZone.addEventListener('dragover', (e) => { e.preventDefault(); editPhotoDropZone.classList.add('bg-blue-50'); });
    editPhotoDropZone.addEventListener('dragleave', () => editPhotoDropZone.classList.remove('bg-blue-50'));
    editPhotoDropZone.addEventListener('drop', (e) => { e.preventDefault(); editPhotoDropZone.classList.remove('bg-blue-50'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], editPhotoPreviewContainer, editPhotoDataInput); });
    editPhotoFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0], editPhotoPreviewContainer, editPhotoDataInput); });

    importExcelBtn.addEventListener('click', () => excelModal.classList.remove('hidden'));
    cancelImportBtn.addEventListener('click', () => { resetModal(); excelModal.classList.add('hidden'); });
    excelFileInput.addEventListener('change', handleExcelFileSelect);
    sheetSelector.addEventListener('change', handleSheetSelect);
    processImportBtn.addEventListener('click', processExcelImport);

    volunteerTilesContainer.addEventListener('click', handleTileClick);
    closeInfoModalBtn.addEventListener('click', () => workerInfoModal.classList.add('hidden'));
    workerInfoModal.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const workerId = target.dataset.id;
        if (target.id === 'info-edit-btn') {
            workerInfoModal.classList.add('hidden');
            openEditModal(workerId);
        } else if (target.id === 'info-archive-btn') {
            workerToArchiveAction = allWorkers.find(w => w.id == workerId);
            if (workerToArchiveAction) {
                workerInfoModal.classList.add('hidden');
                archiveWorkerName.textContent = workerToArchiveAction.FullName;
                archiveModal.classList.remove('hidden');
                confirmArchiveBtn.disabled = true;
                document.querySelectorAll('input[name="archive-reason"]').forEach(radio => radio.checked = false);
            }
        }
    });

    cancelArchiveBtn.addEventListener('click', () => archiveModal.classList.add('hidden'));
    confirmArchiveBtn.addEventListener('click', executeArchive);
    archiveModal.addEventListener('change', (e) => { if (e.target.name === 'archive-reason') confirmArchiveBtn.disabled = false; });
    
    assignmentWorkerSearch.addEventListener('input', (e) => handleWorkerSearch(e, 'assignment'));
    assignmentProjectSelect.addEventListener('change', populateAreaDropdown);
    assignmentAreaSelect.addEventListener('change', checkAssignmentForm);
    assignmentForm.addEventListener('submit', submitAssignment);
    assignmentProjectsList.addEventListener('click', (e) => {
        const card = e.target.closest('.card[data-project-id]');
        if (card) {
            openAssignmentProjectInfoModal(card.dataset.projectId);
        }
    });
    closeProjectInfoModalBtn.addEventListener('click', () => assignmentProjectInfoModal.classList.add('hidden'));

    absenceWorkerSearch.addEventListener('input', (e) => handleWorkerSearch(e, 'absence'));
    absenceForm.addEventListener('submit', submitAbsence);
    assignmentsTable.addEventListener('click', handleAssignmentTableActions);
    assignmentListContainer.addEventListener('click', handleBatchListRemove);
    absenceListContainer.addEventListener('click', handleBatchListRemove);
    
    dashboardAbsenteesTable.addEventListener('click', handleDashboardAbsenteeAction); 
    
    createProjectBtn.addEventListener('click', () => projectModal.classList.remove('hidden'));
    cancelProjectBtn.addEventListener('click', () => projectModal.classList.add('hidden'));
    projectForm.addEventListener('submit', handleCreateProject);

    projectsList.addEventListener('click', handleProjectActions);
    editProjectForm.addEventListener('submit', handleUpdateProject);
    cancelEditProjectBtn.addEventListener('click', () => editProjectModal.classList.add('hidden'));

    fundReceivedForm.addEventListener('submit', handleFundReceived);
    fundSpentForm.addEventListener('submit', handleFundSpent);

    editWorkerForm.addEventListener('submit', handleUpdateWorker);
    cancelEditWorkerBtn.addEventListener('click', () => {
        editWorkerModal.classList.add('hidden');
    });
    
    requestSearchInput.addEventListener('input', (e) => handleWorkerSearch(e, 'request'));
    leaveRequestForm.addEventListener('submit', handleLeaveRequestSubmit);
    [leaveStartDate, leaveEndDate, leaveReason].forEach(el => el.addEventListener('input', checkLeaveRequestForm));
    [leaveStartDate, leaveEndDate].forEach(el => el.addEventListener('change', calculateLeaveDays));
    leaveRequestsTable.addEventListener('click', handleLeaveRequestAction);

    // --- Initial Load ---
    initializeCharts();
    loadInitialData();
});
