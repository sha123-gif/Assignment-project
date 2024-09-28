from flask import Flask, request, jsonify, send_from_directory, render_template, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer
import os
import hashlib

# Flask app configuration
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SECRET_KEY'] = 'your_secret_key_here'
app.config['UPLOAD_FOLDER'] = './uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max file size

# Initialize database
db = SQLAlchemy(app)
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# User and File models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'ops' or 'client'

class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(150), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Create the database tables
with app.app_context():
    db.create_all()

# Hash password utility
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Generate a secure download token
def generate_download_token(file_id):
    return s.dumps(file_id, salt='file-download')

# Verify a secure download token
def verify_download_token(token):
    try:
        file_id = s.loads(token, salt='file-download', max_age=3600)  # Token valid for 1 hour
        return file_id
    except Exception:
        return None

# User signup
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data['email']
    password = hash_password(data['password'])
    role = data['role']
    
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User already exists"}), 400
    
    user = User(email=email, password=password, role=role)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Signup successful! Redirecting to login."}), 200

# User login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    password = hash_password(data['password'])
    user = User.query.filter_by(email=email, password=password).first()
    
    if not user:
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({"message": "Login successful", "role": user.role}), 200

# File upload for Ops user
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    # Allowed file extensions
    allowed_extensions = {'pptx', 'docx', 'xlsx'}
    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if file_extension not in allowed_extensions:
        return jsonify({"message": "Invalid file type. Only .pptx, .docx, and .xlsx files are allowed."}), 400

    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    # Assume you have logic to get the user ID
    user_id = 1  # Replace with the actual user ID
    new_file = File(filename=filename, user_id=user_id)
    db.session.add(new_file)
    db.session.commit()

    # Generate a secure download token
    download_token = generate_download_token(new_file.id)
    download_link = f"/download/{download_token}"
    
    return jsonify({"message": "File uploaded successfully", "download_link": download_link}), 200

# List files for Client users
@app.route('/list_files', methods=['GET'])
def list_files():
    files = File.query.all()
    file_list = [{"file_id": f.id, "filename": f.filename, "download_link": generate_download_token(f.id)} for f in files]
    return jsonify({"files": file_list}), 200

# Serve the uploaded files with token verification
@app.route('/download/<token>', methods=['GET'])
def download_file(token):
    file_id = verify_download_token(token)
    if file_id is None:
        return jsonify({"message": "Invalid or expired token"}), 403

    file = File.query.get(file_id)
    if not file:
        return jsonify({"message": "File not found"}), 404
    
    return send_from_directory(app.config['UPLOAD_FOLDER'], file.filename)

# Render pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    return render_template('signup.html')

@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

if __name__ == '__main__':
    # Ensure upload folder exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)
