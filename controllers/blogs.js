const blogsRouter = require('express').Router()
const Blog = require('../models/blog') // <--- ¡Importa el modelo Blog!
const User = require('../models/user') // <--- ¡Importa el modelo User!
const jwt = require('jsonwebtoken') // <--- ¡Importa jwt!


// --- Ruta GET /api/blogs - Obtener todos los blogs ---
blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

// --- Ruta POST /api/blogs - Crear un nuevo blog ( PROTEGIDA POR TOKEN) ---
blogsRouter.post('/', async (request, response, next) => {
  const body = request.body
  const token = request.token // Accede al Token desde request.token!

  try {
    // 1. Verificar y decodificar el token
    const decodedToken = jwt.verify(token, process.env.SECRET)

    // 2. Si el token no tiene ID, no autorizado
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid or missing user ID' })
    }

    // 3. Buscar el usuario en la base de datos usando el ID del token decodificado
    const user = await User.findById(decodedToken.id)

    // 4. Si el usuario no existe (ej. fue borrado), no autorizado
    if (!user) {
      return response.status(401).json({ error: 'user not found' })
    }

    // 5. Crear la nueva instancia de Blog, asociándola al usuario identificado por el token
    const blog = new Blog({
      title: body.title,
      author: body.author,
      url: body.url,
      likes: body.likes || 0,
      user: user._id // Asigna el blog al usuario que hizo la solicitud
    })

    // 6. Guardar el blog
    const savedBlog = await blog.save()

    // 7. Añadir el ID del nuevo blog a la lista de blogs del usuario
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save() // Guarda el usuario actualizado

    // 8. Popula el campo 'user' en el blog guardado antes de enviarlo como respuesta
    const populatedBlog = await savedBlog.populate('user', { username: 1, name: 1 })
    response.status(201).json(populatedBlog)

  } catch (error) {
    // Pasa el error al middleware de manejo de errores (manejará JsonWebTokenError, etc.)
    next(error)
  }
})

// --- Ruta DELETE /api/blogs/:id - Eliminar un blog (PROTEGIDA Y AUTORIZADA) ---
blogsRouter.delete('/:id', async (request, response, next) => {
  const token = request.token
  const blogId = request.params.id

  try {
    // 1. Verificar el token JWT
    const decodedToken = jwt.verify(token, process.env.SECRET)

    // 2. Verificar que el token contiene un ID de usuario
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid or missing user ID' })
    }

    // 3. Buscar el blog que se quiere eliminar
    const blogToDelete = await Blog.findById(blogId)

    // 4. Si el blog no existe, devolver 204 No Content (operación idempotente)
    // Opcional: Podrías devolver 404 si prefieres ser más estricto, pero 204 es común para DELETE.
    if (!blogToDelete) {
      return response.status(204).end()
    }

    // 5. Verificar si el usuario que intenta eliminar es el creador del blog
    // Convertimos el ObjectId de blog.user a string para la comparación
    if (blogToDelete.user.toString() !== decodedToken.id.toString()) {
      // 403 Forbidden
      return response.status(403).json({ error: 'user not authorized to delete this blog' })
    }

    // 6. Si el usuario es el creador, proceder con la eliminación del blog
    await Blog.findByIdAndDelete(blogId)

    // 7. Eliminar la referencia del blog del array de blogs del usuario
    // Encuentra al usuario por el ID del token decodificado
    const user = await User.findById(decodedToken.id)
    if (user) {
      // Filtra el array de blogs del usuario para remover el ID del blog eliminado
      user.blogs = user.blogs.filter(blogRef => blogRef.toString() !== blogId.toString())
      await user.save() // Guarda el usuario con la referencia eliminada
    }

    // 8. Responder con 204 No Content indicando éxito
    response.status(204).end()

  } catch (error) {
    // Pasa errores (como JsonWebTokenError, CastError para ID de blog malformado) al middleware de errores
    next(error)
  }
})

// --- Ruta PUT /api/blogs/:id - Actualizar un blog ---
blogsRouter.put('/:id', async (request, response, next) => {
  const body = request.body
  const id = request.params.id

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  }

  try {
    const updatedBlog = await Blog.findByIdAndUpdate(id, blog, { new: true, runValidators: true, context: 'query' })

    if (updatedBlog) {
      response.json(updatedBlog)
    } else {
      response.status(404).end()
    }

  } catch (error) {
    next(error)
  }
})

module.exports = blogsRouter // Exporta el router