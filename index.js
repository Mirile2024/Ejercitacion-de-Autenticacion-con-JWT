const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
const path = require('path');
const usuarios = require('./data/usuarios');
const tareas = require('./data/tareas');
const secretKey = 'ultra-secreto';
const jwt = require('jsonwebtoken');

const usuariosFilePath = path.join(__dirname, 'data/usuarios.js');
const tareasFilePath = path.join(__dirname, 'data/tareas.js');

function saveUsuarios(){
    fs.writeFileSync(usuariosFilePath, `module.exports = ${JSON.stringify(usuarios, null, 2)};`, 'utf-8');
}
function saveTareas(){
    fs.writeFileSync(tareasFilePath, `module.exports = ${JSON.stringify(tareas, null, 2)};`, 'utf-8');
}
//middleware
app.use(express.json());
//estructura para autenticar el token 
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token" });
  }
  //verificacion del token 
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ error: "Token no válido" });
    }
    req.user = user;
    next();
  });
};
//registro de nuevo usuario
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (usuarios.find((usuario) => usuario.username === username)) {
    res.status(400).json({ error: "El usuario ya existe" });
  }
  usuarios.push({ id: usuarios.length + 1 ,username, password });
  saveUsuarios();
  res.json({ message: "Usuario registrado" });
});
//login de usuario
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const usuario = usuarios.find((usuario) => usuario.username === username);
  if (!usuario) {
     res.status(400).json({ error: "Usuario no encontrado" });
  }
  if (usuario.password !== password) {
     res.status(400).json({ error: "Contraseña incorrecta" });
  }
  //creacion de token
  const accessToken = jwt.sign({ username: usuario.username, id: usuario.id }, secretKey);
  res.json({ accessToken });
});
//agregar tareas
app.post('/tareas', authenticateToken, (req, res ) => {
  const { tarea, description } = req.body; 
  const nuevaTarea = { 
     id: tareas.length + 1,
     userId: req.user.id,
     tarea: tarea || '',
     description: description || '',
    };
  tareas.push(nuevaTarea);
  saveTareas();
  res.json(nuevaTarea);  
});
// listar tareas
app.get('/tareas', authenticateToken, (req, res) => {
    const userTareas = tareas.filter((tarea) => tarea.userId === req.user.id);
  res.json(userTareas);
});
//borrar tareas por usuario
app.delete('/tareas/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const tarea = tareas.findIndex((tarea) => tarea.id === id);
  if (!tarea) {
    return res.status(404).json({ error: "Tarea no encontrada" });
  }
  if (tareas[tarea].userId !== req.user.id) {
    return res.status(403).json({ error: "No tienes permiso para eliminar esta tarea" });
  }
  tareas.splice(tarea, 1);
  saveTareas();
  res.json({ message: "Tarea eliminada" });
});
//llamar al servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = {authenticateToken};