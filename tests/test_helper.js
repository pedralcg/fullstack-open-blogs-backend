
const mongoose = require('mongoose')
const User = require('../models/user')
const bcrypt = require('bcrypt')


// Datos iniciales de blogs para tus pruebas de integración
const initialBlogs = [
  {
    title: "Introduction to Unit Testing",
    author: "Test Writer",
    url: "http://example.com/unit-testing",
    likes: 10
  },
  {
    title: "Express.js Middleware Deep Dive",
    author: "API Guru",
    url: "http://example.com/express-middleware",
    likes: 20
  },
  {
    title: "Learning Testing Basics",
    author: "Dev Student",
    url: "http://example.com/testing-basics",
    likes: 5
  },
  {
    title: "API Design Patterns",
    author: "Senior Engineer",
    url: "http://example.com/api-patterns",
    likes: 15
  },
]


// Datos iniciales de USUARIOS para tus pruebas de integración
const initialUsers = [
  {
    username: 'testuser1',
    name: 'Test User One',
    password: 'password123', // Contraseña en texto plano para bcrypt
  },
  {
    username: 'testuser2',
    name: 'Test User Two',
    password: 'password456',
  },
]

// Función auxiliar para obtener todos los usuarios de la base de datos de prueba
const usersInDb = async () => {
  const users = await User.find({})
  return users.map(u => u.toJSON())
}


// Función auxiliar para obtener todos los blogs almacenados actualmente en la base de datos de prueba
// Se obtiene el modelo 'Blog' de la instancia global de Mongoose.
const blogsInDb = async () => {
  const Blog = mongoose.model('Blog') // <--- Obtiene el modelo Blog de Mongoose
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON()) // Convertir a formato JSON limpio
}

// Función auxiliar para generar un ID de blog que sabemos que NO existe en la base de datos
// Se obtiene el modelo 'Blog' de la instancia global de Mongoose.
const nonExistingId = async () => {
  const Blog = mongoose.model('Blog') // <--- Obtiene el modelo Blog de Mongoose
  const blog = new Blog({ title: 'temporary to delete', author: 'temp', url: 'http://temp.com', likes: 0 })
  await blog.save()
  await blog.deleteOne() // Borra la nota inmediatamente
  return blog._id.toString()
}

module.exports = {
  initialBlogs,
  blogsInDb,
  nonExistingId,
  initialUsers,
  usersInDb,
}