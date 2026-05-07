document.addEventListener('DOMContentLoaded', function() {
    
    const chartCanvas = document.getElementById('expenseChart');
    if (!chartCanvas) return; // Only run on dashboard

    // Fetch and render data
    function loadDashboardData() {
        fetch('/api/chart-data')
            .then(res => res.json())
            .then(data => {
                // Update total expense, income, balance
                const totalExpense = data.total_expense || 0;
                const totalIncome = data.total_income || 0;
                const netBalance = totalIncome - totalExpense;

                const expenseEl = document.getElementById('totalExpense');
                if (expenseEl) expenseEl.textContent = `$${totalExpense.toLocaleString()}`;
                
                const incomeEl = document.getElementById('totalIncome');
                if (incomeEl) incomeEl.textContent = `$${totalIncome.toLocaleString()}`;
                
                const balanceEl = document.getElementById('netBalance');
                if (balanceEl) {
                    balanceEl.textContent = `$${netBalance.toLocaleString()}`;
                    if (netBalance < 0) {
                        balanceEl.classList.remove('text-success', 'text-dark');
                        balanceEl.classList.add('text-danger');
                    } else if (netBalance > 0) {
                        balanceEl.classList.remove('text-danger', 'text-dark');
                        balanceEl.classList.add('text-success');
                    } else {
                        balanceEl.classList.remove('text-danger', 'text-success');
                        balanceEl.classList.add('text-dark');
                    }
                }
                
                // Update Budget
                const usedEl = document.getElementById('usedBudget');
                const limitEl = document.getElementById('budgetLimit');
                const progressEl = document.getElementById('budgetProgress');
                
                usedEl.textContent = `$${data.total_expense.toLocaleString()}`;
                
                if (data.budget > 0) {
                    limitEl.textContent = `$${data.budget.toLocaleString()}`;
                    let percent = Math.min((data.total_expense / data.budget) * 100, 100);
                    progressEl.style.width = `${percent}%`;
                    progressEl.textContent = `${percent.toFixed(0)}%`;
                    
                    if (percent >= 100) {
                        progressEl.classList.add('bg-danger');
                        progressEl.classList.remove('bg-warning', 'bg-success');
                    } else if (percent >= 80) {
                        progressEl.classList.add('bg-warning');
                        progressEl.classList.remove('bg-danger', 'bg-success');
                    } else {
                        progressEl.classList.add('bg-success');
                        progressEl.classList.remove('bg-danger', 'bg-warning');
                    }
                } else {
                    limitEl.textContent = '未設定';
                    progressEl.style.width = '0%';
                    progressEl.textContent = '';
                }

                // Render Chart
                if (window.expenseChartInstance) {
                    window.expenseChartInstance.destroy();
                }

                const ctx = chartCanvas.getContext('2d');
                if (data.labels.length === 0) {
                    // No data empty state
                    ctx.font = "16px Inter";
                    ctx.textAlign = "center";
                    ctx.fillText("本月尚無支出紀錄", chartCanvas.width/2, chartCanvas.height/2);
                    return;
                }

                window.expenseChartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            data: data.data,
                            backgroundColor: [
                                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                            ],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    font: { family: "'Inter', sans-serif" }
                                }
                            }
                        },
                        cutout: '70%'
                    }
                });
            });
    }

    loadDashboardData();

    // Handle Budget Form
    const budgetForm = document.getElementById('budgetForm');
    budgetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const amount = document.getElementById('budgetInput').value;
        
        fetch('/api/budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount })
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                // Show toast via global function if possible, or just alert
                const toastEl = document.getElementById('liveToast');
                if (toastEl) {
                    document.getElementById('toastMessage').textContent = '預算設定成功';
                    new bootstrap.Toast(toastEl).show();
                }
                document.getElementById('budgetInput').value = '';
                loadDashboardData(); // Refresh chart and progress
            }
        });
    });
});
