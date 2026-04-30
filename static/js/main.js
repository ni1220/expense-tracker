document.addEventListener('DOMContentLoaded', function() {
    
    // Toast Notification helper
    function showToast(message, isError = false) {
        const toastEl = document.getElementById('liveToast');
        const toastBody = document.getElementById('toastMessage');
        if (!toastEl || !toastBody) return;
        
        toastBody.textContent = message;
        if (isError) {
            toastEl.classList.remove('bg-success');
            toastEl.classList.add('bg-danger');
        } else {
            toastEl.classList.remove('bg-danger');
            toastEl.classList.add('bg-success');
        }
        
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    // --- Add Record Page Logic ---
    const addRecordForm = document.getElementById('addRecordForm');
    if (addRecordForm) {
        // Pre-fill today's date
        const dateInput = document.getElementById('date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Toggle Categories based on Type
        const typeRadios = document.querySelectorAll('input[name="type"]');
        const expenseCategories = document.getElementById('expenseCategories');
        const incomeCategories = document.getElementById('incomeCategories');
        
        typeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'income') {
                    expenseCategories.classList.add('d-none');
                    incomeCategories.classList.remove('d-none');
                    // auto select first income category
                    document.getElementById('catSalary').checked = true;
                } else {
                    incomeCategories.classList.add('d-none');
                    expenseCategories.classList.remove('d-none');
                    // auto select first expense category
                    document.getElementById('catFood').checked = true;
                }
            });
        });

        // AJAX Form Submission
        addRecordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showToast('記錄成功！');
                    // Clear amount and description for next input, keep date and type
                    document.getElementById('amount').value = '';
                    document.getElementById('description').value = '';
                    document.getElementById('amount').focus();
                } else {
                    showToast(result.error || '記錄失敗', true);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('發生錯誤', true);
            });
        });
    }

    // --- History Page Logic ---
    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!confirm('確定要刪除這筆紀錄嗎？')) return;
            
            const id = this.getAttribute('data-id');
            fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    document.getElementById(`row-${id}`).remove();
                    showToast('刪除成功');
                } else {
                    showToast('刪除失敗', true);
                }
            });
        });
    });
});
