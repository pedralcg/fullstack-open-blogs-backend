const jwt = require('jsonwebtoken') // Para crear y verificar JWTs
const bcrypt = require('bcrypt')   // Para comparar contraseñas
const loginRouter = require('express').Router() // Crea un nuevo router de Express
const User = require('../models/user') // Importa el modelo User para buscar usuarios

// --- Ruta POST /api/login - Iniciar Sesión ---
loginRouter.post('/', async (request, response, next) => {
  const { username, password } = request.body // Obtiene las credenciales del cuerpo

  try {
    // 1. Buscar el usuario por nombre de usuario
    const user = await User.findOne({ username })

    // 2. Verificar la contraseña
    // bcrypt.compare devuelve true si la contraseña en texto plano coincide con el hash
    const passwordCorrect = user === null
      ? false // Si el usuario no existe, la contraseña no puede ser correcta
      : await bcrypt.compare(password, user.passwordHash) // Compara la contraseña con el hash

    // 3. Si las credenciales son inválidas, devolver 401 Unauthorized
    if (!(user && passwordCorrect)) {
      return response.status(401).json({
        error: 'invalid username or password'
      })
    }

    // 4. Si las credenciales son válidas, crear el objeto para el token
    const userForToken = {
      username: user.username,
      id: user._id, // Usamos el _id del usuario como identificador en el token
    }

    // 5. Generar el token JWT
    // jwt.sign(payload, secret, [options])
    // El token expira en 60 minutos (60 * 60 segundos)
    const token = jwt.sign(userForToken, process.env.SECRET, { expiresIn: 60 * 60 })

    // 6. Devolver el token y los detalles básicos del usuario
    response
      .status(200)
      .send({ token, username: user.username, name: user.name })

  } catch (error) {
    // En caso de cualquier otro error (ej. problemas de DB), pasarlo al middleware de errores
    next(error)
  }
})

module.exports = loginRouter // Exporta el router para usarlo en app.js