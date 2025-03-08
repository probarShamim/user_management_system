const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const DATA_FILE = path.join(__dirname, 'users.json');

// Helper: JSON file theke users load kora
function getUsers() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper: JSON file e users save kora
function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Serve static CSS file
  if (pathname === '/style.css') {
    const cssPath = path.join(__dirname, 'public', 'style.css');
    fs.readFile(cssPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading CSS file');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(data);
      }
    });
    return;
  }

  // Serve static HTML pages for GET requests: /add, /delete, /update
  if (method === 'GET' && (pathname === '/add' || pathname === '/delete' || pathname === '/update')) {
    const fileName = pathname.substring(1) + '.html'; // e.g., add.html
    const filePath = path.join(__dirname, 'public', fileName);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading page');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }

  // Home page: dynamic user list
  if (method === 'GET' && (pathname === '/' || pathname === '/home')) {
    const users = getUsers();
    let tableContent = "";
    if (users.length === 0) {
      tableContent = "<p>No users available.</p>";
    } else {
      tableContent = `<table>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Age</th>
          <th>Gmail</th>
        </tr>`;
      users.forEach(user => {
        tableContent += `<tr>
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.age}</td>
          <td>${user.gmail}</td>
        </tr>`;
      });
      tableContent += `</table>`;
    }
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading home page');
      } else {
        // Placeholder replacement: <!-- USER_TABLE -->
        const html = data.replace('<!-- USER_TABLE -->', tableContent);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      }
    });
    return;
  }

  // POST: Add User
  if (method === 'POST' && pathname === '/add') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const postData = querystring.parse(body);
      const users = getUsers();
      if (users.find(u => u.id == postData.id)) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: User with this ID already exists.</h1><a href="/">Home</a>');
        return;
      }
      const newUser = {
        id: Number(postData.id),
        name: postData.name,
        age: Number(postData.age),
        gmail: postData.gmail
      };
      users.push(newUser);
      saveUsers(users);
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // POST: Delete User
  if (method === 'POST' && pathname === '/delete') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const postData = querystring.parse(body);
      const users = getUsers();
      const idToDelete = Number(postData.id);
      const filteredUsers = users.filter(u => u.id !== idToDelete);
      if (filteredUsers.length === users.length) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: User not found.</h1><a href="/">Home</a>');
        return;
      }
      saveUsers(filteredUsers);
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // POST: Update User
  if (method === 'POST' && pathname === '/update') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const postData = querystring.parse(body);
      const users = getUsers();
      const userId = Number(postData.id);
      const index = users.findIndex(u => u.id === userId);
      if (index === -1) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: User not found.</h1><a href="/">Home</a>');
        return;
      }
      users[index] = {
        id: userId,
        name: postData.name,
        age: Number(postData.age),
        gmail: postData.gmail
      };
      saveUsers(users);
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 Not Found</h1>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
