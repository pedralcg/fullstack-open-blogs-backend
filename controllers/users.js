

const bcrypt = require('bcrypt') // Para hashear contraseñas
const usersRouter = require('express').Router() // Crea un nuevo router de Express
const User = require('../models/user')

//* Ruta POST /api/users - Crear nuevo usuario
usersRouter.post('/', async (request, response, next) => {
  // Extrae los datos del cuerpo de la solicitud
  const { username, name, password } = request.body

  // Validaciones adicionales para la contraseña (ya que Mongoose no tiene 'minlength' para passwordHash)
  if (!password || password.length < 3) {
    return response.status(400).json({ error: 'password must be at least 3 characters long' })
  }
  // La validación de username.minlength y username.unique se manejará por Mongoose/errorHandler

  try {
    const saltRounds = 10 // Número de rondas para el salado (costo de la encriptación)
    const passwordHash = await bcrypt.hash(password, saltRounds) // Hashea la contraseña

    const user = new User({
      username,
      name,
      passwordHash, // Guarda el hash, no la contraseña en texto plano
    })

    const savedUser = await user.save() // Guarda el nuevo usuario en la base de datos
    response.status(201).json(savedUser) // Responde con el usuario creado (sin passwordHash)
  } catch (error) {
    // Pasa cualquier error (ej. validación de Mongoose, duplicación de username) al middleware de errores
    next(error)
  }
})

//* Ruta GET /api/users - Ver todos los usuarios
usersRouter.get('/', async (request, response) => {
  // Popula los blogs de cada usuario si quieres verlos en la respuesta
  // Esto cargará los documentos completos de blog en lugar de solo sus IDs.
  const users = await User.find({}).populate('blogs', { title: 1, author: 1, url: 1 })
  response.json(users) // Responde con la lista de usuarios
})

module.exports = usersRouter