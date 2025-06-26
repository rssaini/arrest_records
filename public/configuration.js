let fieldCounter = 0;

// Time field functionality
function updateCronFromTime() {
    const timeInput = document.getElementById('scheduleTime');
    const timeValue = timeInput.value;
    
    if (timeValue) {
        const [hours, minutes] = timeValue.split(':');
        const cronValue = `${parseInt(minutes)} ${parseInt(hours)} * * *`;
        document.getElementById('cronSchedule').value = cronValue;
    }
}

function addNameField(val = '') {
    fieldCounter++;
    const container = document.getElementById('nameFields');
    const emptyState = document.getElementById('emptyState');
    
    // Hide empty state if it's visible
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'name-field-group';
    fieldGroup.innerHTML = `
        <div class="field-number">${fieldCounter}</div>
        <input 
            type="text" 
            name="names[]" 
            value="${val}"
            class="name-input"
            placeholder="Enter FTA ${fieldCounter}"
            required
        >
        <button type="button" class="btn btn-remove" onclick="removeNameField(this)">
            Remove
        </button>
    `;
    
    container.appendChild(fieldGroup);
}

function removeNameField(button) {
    const fieldGroup = button.parentElement;
    fieldGroup.remove();
    
    // Show empty state if no fields remain
    const container = document.getElementById('nameFields');
    const remainingFields = container.querySelectorAll('.name-field-group');
    
    if (remainingFields.length === 0) {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
    }
    
    // Update field numbers
    updateFieldNumbers();
}

function updateFieldNumbers() {
    const fieldGroups = document.querySelectorAll('.name-field-group');
    fieldGroups.forEach((group, index) => {
        const numberElement = group.querySelector('.field-number');
        const inputElement = group.querySelector('.name-input');
        
        numberElement.textContent = index + 1;
        inputElement.placeholder = `Enter name ${index + 1}`;
    });
    
    fieldCounter = fieldGroups.length;
}

// Form submission handler
document.getElementById('cronForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const cronSchedule = formData.get('cronSchedule');
    const scheduleTime = formData.get('scheduleTime');
    const names = formData.getAll('names[]');
    
    const data = {
        cronSchedule: cronSchedule,
        names: names.filter(name => name.trim() !== '')
    };
    
    console.log('Form Data:', data);
    $.post('/api/settings', data).done(res => {
        cancelConfigurationForm();
        showToast('Configuration Updated');
    }).fail(err => {});
});

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    document.getElementById('scheduleTime').addEventListener('change', updateCronFromTime);
});
function loadSettings(){
    $.get('/api/settings').done(data => {
        console.log(data);
        const time = data.cron_schedule.split(' ');
        $('#scheduleTime').val(`${time[1].padStart(2, '0')}:${time[0].padStart(2, '0')}`);
        updateCronFromTime();
        const fta_names = JSON.parse(data.fta_names);
        fta_names.forEach(name => {
            addNameField(name);
        });
    }).fail(err => {});
}

function cancelConfigurationForm(){
    $('#configurationModal').modal('hide');
    location.reload();
}
