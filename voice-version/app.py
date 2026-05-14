from flask import Flask, render_template, request, jsonify, redirect, url_for
from database import get_db_connection, init_db
from datetime import datetime
import calendar
import os

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize DB on startup
with app.app_context():
    init_db()

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/add')
def add_record():
    return render_template('add_record.html')

@app.route('/history')
def history():
    start_date = request.args.get('start', '')
    end_date = request.args.get('end', '')
    keyword = request.args.get('keyword', '')
    
    conn = get_db_connection()
    query = 'SELECT * FROM transactions WHERE 1=1'
    params = []
    
    if start_date:
        query += ' AND date >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND date <= ?'
        params.append(end_date)
    if keyword:
        query += ' AND (description LIKE ? OR category LIKE ?)'
        params.extend(['%'+keyword+'%', '%'+keyword+'%'])
        
    query += ' ORDER BY date DESC, id DESC'
    
    transactions = conn.execute(query, params).fetchall()
    conn.close()
    
    return render_template('history.html', transactions=transactions)

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/api/upload-bg', methods=['POST'])
def upload_bg():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        filename = 'custom_bg_' + datetime.now().strftime('%Y%m%d%H%M%S') + os.path.splitext(file.filename)[1]
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        return jsonify({'success': True, 'url': url_for('static', filename='uploads/' + filename)})

@app.route('/calendar')
def calendar_view():
    return render_template('calendar.html')

@app.route('/api/calendar-data')
def calendar_data():
    month_str = request.args.get('month', datetime.today().strftime('%Y-%m'))
    conn = get_db_connection()
    
    expenses = conn.execute('''
        SELECT date, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND date LIKE ?
        GROUP BY date
    ''', (month_str + '%',)).fetchall()
    
    conn.close()
    
    data = {}
    for row in expenses:
        data[row['date']] = row['total']
        
    return jsonify(data)

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    data = request.json
    t_type = data.get('type')
    amount = float(data.get('amount', 0))
    category = data.get('category')
    date_str = data.get('date', datetime.today().strftime('%Y-%m-%d'))
    description = data.get('description', '')
    
    if not t_type or not amount or not category:
        return jsonify({'error': 'Missing required fields'}), 400
        
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO transactions (type, amount, category, date, description)
        VALUES (?, ?, ?, ?, ?)
    ''', (t_type, amount, category, date_str, description))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Transaction saved successfully'}), 201

@app.route('/api/transactions/<int:id>', methods=['DELETE'])
def delete_transaction(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM transactions WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True}), 200

@app.route('/api/chart-data')
def chart_data():
    month_str = datetime.today().strftime('%Y-%m')
    conn = get_db_connection()
    
    # Get expenses by category for the current month
    expenses = conn.execute('''
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND date LIKE ?
        GROUP BY category
    ''', (month_str + '%',)).fetchall()
    
    # Get total expenses
    total_expense_row = conn.execute('''
        SELECT SUM(amount) as total
        FROM transactions
        WHERE type = 'expense' AND date LIKE ?
    ''', (month_str + '%',)).fetchone()
    total_expense = total_expense_row['total'] or 0
    
    # Get total income
    total_income_row = conn.execute('''
        SELECT SUM(amount) as total
        FROM transactions
        WHERE type = 'income' AND date LIKE ?
    ''', (month_str + '%',)).fetchone()
    total_income = total_income_row['total'] or 0
    
    # Get budget for the current month
    budget_row = conn.execute('SELECT limit_amount FROM budget WHERE month = ?', (month_str,)).fetchone()
    budget = budget_row['limit_amount'] if budget_row else 0
    
    conn.close()
    
    labels = [row['category'] for row in expenses]
    data = [row['total'] for row in expenses]
    
    return jsonify({
        'labels': labels,
        'data': data,
        'total_expense': total_expense,
        'total_income': total_income,
        'budget': budget
    })

@app.route('/api/budget', methods=['POST'])
def set_budget():
    data = request.json
    limit_amount = float(data.get('amount', 0))
    month_str = datetime.today().strftime('%Y-%m')
    
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO budget (month, limit_amount)
        VALUES (?, ?)
        ON CONFLICT(month) DO UPDATE SET limit_amount=excluded.limit_amount
    ''', (month_str, limit_amount))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5555)
