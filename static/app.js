document.addEventListener('DOMContentLoaded', function() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const uploadSection = document.getElementById('uploadSection');
    const filesSection = document.getElementById('filesSection');
    const uploadedFilesList = document.getElementById('filesList'); // List of uploaded files
    const clientFilesList = document.getElementById('clientFilesList'); // List for Client users

    // Handle signup
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent default form submission

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            try {
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password, role }),
                });

                const data = await response.json();
                document.getElementById('message').innerText = data.message;

                if (response.ok) {
                    setTimeout(() => {
                        window.location.href = '/login'; // Redirect to login page after successful signup
                    }, 2000); // Redirect after 2 seconds
                }
            } catch (error) {
                console.error('Error during signup:', error);
                document.getElementById('message').innerText = 'Error: ' + error.message; // Display error message
            }
        });
    }

    // Handle login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent the default form submission

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (!response.ok) {
                    throw new Error('Invalid credentials');
                }

                const data = await response.json();
                localStorage.setItem('userRole', data.role); // Store user role in local storage
                window.location.href = "/dashboard"; // Redirect to dashboard
            } catch (error) {
                console.error('Error during login:', error);
                document.getElementById('message').innerText = error.message; // Display error message
            }
        });
    }

    // Check user role on dashboard load
    function checkUserRole() {
        const userRole = localStorage.getItem('userRole');

        if (!userRole) {
            console.warn("No user role found, redirecting to login.");
            window.location.href = "/login"; // Redirect to login if not authenticated
            return null; // User is not authenticated
        }

        // Show relevant sections based on role
        if (userRole === 'ops') {
            welcomeMessage.innerText = 'Welcome, Ops User!';
            uploadSection.style.display = 'block';
        } else if (userRole === 'client') {
            welcomeMessage.innerText = 'Welcome, Client User!';
            filesSection.style.display = 'block';
            loadClientFiles(); // Load files for Client users
        }
    }

    // Load files for Client users
    async function loadClientFiles() {
        clientFilesList.innerHTML = 'Loading files...'; // Indicate loading

        try {
            const response = await fetch('/list_files', {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }

            const data = await response.json(); // Parse JSON response
            clientFilesList.innerHTML = ''; // Clear the list first

            if (data.files && data.files.length > 0) {
                data.files.forEach(file => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item'; // Bootstrap class for list items
                    li.innerHTML = `<a href="/download/${file.download_link}" target="_blank">${file.filename}</a>`;
                    clientFilesList.appendChild(li); // Append each file to the list
                });
            } else {
                clientFilesList.innerHTML = '<li class="list-group-item">No files available.</li>'; // Display message if no files
            }
        } catch (error) {
            console.error('Error loading files:', error);
            clientFilesList.innerHTML = '<li class="list-group-item text-danger">Error loading files.</li>'; // Show error message
        }
    }

    // Handle file upload for Ops users
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent default form submission

            const fileInput = document.getElementById('file');
            const file = fileInput.files[0];

            // Validate file type
            const allowedExtensions = /(\.pptx|\.docx|\.xlsx)$/i;
            if (!allowedExtensions.exec(file.name)) {
                document.getElementById('uploadMessage').innerText = 'Invalid file type. Only .pptx, .docx, and .xlsx files are allowed.';
                fileInput.value = ''; // Clear the input
                return; // Stop the upload process
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                document.getElementById('uploadMessage').innerText = data.message;

                if (response.ok) {
                    // Add the newly uploaded file to the uploaded files list
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.innerHTML = `${file.name} - Uploaded successfully!`;
                    uploadedFilesList.appendChild(li);

                    // Clear the file input field
                    fileInput.value = '';
                }
            } catch (error) {
                console.error('Error during upload:', error);
                document.getElementById('uploadMessage').innerText = 'Error: ' + error.message;
            }
        });
    }

    // Logout functionality
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('userRole'); // Remove user role from local storage
            window.location.href = "/login"; // Redirect to login page
        });
    }

    // Initialize the app on dashboard
    if (window.location.pathname === "/dashboard") {
        checkUserRole(); // Check user role on dashboard load
    }
});