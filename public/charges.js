let charges = [];
document.addEventListener('DOMContentLoaded', loadCharges);

async function loadCharges() {
    try {
        const response = await fetch(`/api/charges`);
        charges = await response.json();
        displayCharges(charges);
    } catch (error) {
        showAlert('Error loading charges: ' + error.message, 'danger');
    }
}

function displayCharges(charges) {
    const tbody = document.getElementById('chargesTableBody');
    tbody.innerHTML = '';

    charges.forEach(charge => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${charge.id}</strong></td>
            <td>${charge.name}</td>
            <td>${charge.chargecode || '<em class="text-muted">N/A</em>'}</td>
            <td>
                <span class="badge status-badge ${charge.status ? 'bg-success' : 'bg-danger'}" 
                      onclick="toggleChargeStatus(${charge.id}, ${charge.status})"
                      title="Click to toggle status">
                    <i class="fas ${charge.status ? 'fa-check' : 'fa-times'} me-1"></i>
                    ${charge.status ? 'Active' : 'Inactive'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function toggleChargeStatus(id, currentStatus) {
    try {
        // Get current charge data
        const response = await fetch(`/api/charges/${id}`);
        const charge = await response.json();
        
        // Toggle status
        const newStatus = currentStatus === 1 ? 0 : 1;
        
        // Update charge with new status
        const updateResponse = await fetch(`/api/charges/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: charge.name,
                status: newStatus,
                chargecode: charge.chargecode
            })
        });

        if (updateResponse.ok) {
            showAlert(`Status changed to ${newStatus ? 'Active' : 'Inactive'}!`, 'success');
            loadCharges();
        } else {
            const error = await updateResponse.json();
            showAlert('Error: ' + error.message, 'danger');
        }
    } catch (error) {
        showAlert('Error toggling status: ' + error.message, 'danger');
    }
}