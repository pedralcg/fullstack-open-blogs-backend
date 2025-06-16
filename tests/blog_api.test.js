
const { test, after, beforeEach, describe } = require('node:test') // Importa ganchos de prueba
const assert = require('node:assert') // Importa la librería de aserciones
const supertest = require('supertest') // Importa SuperTest
const mongoose = require('mongoose') // Importa Mongoose para cerrar la conexión
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const helper = require('./test_helper') // Importa tus funciones auxiliares de prueba
const app = require('../app') // Importa tu aplicación Express

// Envuelve tu aplicación Express con SuperTest para poder hacer peticiones simuladas
const api = supertest(app)

const Blog = require('../models/blog')
const User = require('../models/user')

// Variables globales para usuarios y tokens de prueba
let testUser = null // Usuario de prueba principal (creador de initialBlogs)
let token = null     // Token de autenticación para testUser
let otherUser = null // Segundo usuario para pruebas de "otro usuario"
let otherToken = null // Token para otherUser


//! Configuración antes de CADA prueba
beforeEach(async () => {
  // Limpia completamente las colecciones de usuarios y blogs
  await User.deleteMany({})
  await Blog.deleteMany({})
  // console.log('--- cleared collections for blog tests ---')

  // 1. Crear un usuario principal para la mayoría de los tests y su token
  const passwordHash = await bcrypt.hash('secretpass', 10)
  testUser = new User({ username: 'testuser', name: 'Test User', passwordHash })
  await testUser.save()
  const userForToken = { username: testUser.username, id: testUser._id }
  token = jwt.sign(userForToken, process.env.SECRET)
  // console.log('--- created testUser and token ---')

  // 2. Crear un segundo usuario para pruebas de autorización de "otro usuario"
  const passwordHash2 = await bcrypt.hash('otherpass', 10)
  otherUser = new User({ username: 'otheruser', name: 'Other User', passwordHash: passwordHash2 })
  await otherUser.save()
  const otherUserForToken = { username: otherUser.username, id: otherUser._id }
  otherToken = jwt.sign(otherUserForToken, process.env.SECRET)
  // console.log('--- created otherUser and token ---')

  // 3. Insertar los blogs iniciales y ASOCIARLOS al usuario principal (testUser)
  const blogObjects = helper.initialBlogs.map(blog => ({ ...blog, user: testUser._id }))
  const savedBlogs = await Blog.insertMany(blogObjects)
  // console.log('--- inserted initial blogs associated with testUser ---')

  // 4. Actualizar el usuario principal con los blogs que ha creado
  testUser.blogs = testUser.blogs.concat(savedBlogs.map(b => b._id))
  await testUser.save()
  // console.log('--- updated testUser with blog references ---')
})


//! Conjunto principal de tests para la API de Blogs
describe('Blog API tests', () => {

  //* Tests para GET /api/blogs (obtener blogs)
  describe('fetching blogs', () => {
    test('blogs are returned as json and have the correct amount', async () => {
      const response = await api
        .get('/api/blogs')
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.length, helper.initialBlogs.length, 'Should return the correct number of initial blogs')
    })

    test('all blogs have a unique identifier named id', async () => {
      const blogsAtStart = await helper.blogsInDb()
      blogsAtStart.forEach(blog => assert(blog.id, 'Blog should have an id property'))
    })

    test('blogs are returned with user populated', async () => {
      const response = await api.get('/api/blogs')
      const firstBlog = response.body[0] // Asume que hay al menos un blog

      assert(firstBlog.user, 'Blog should have a user field')
      assert.strictEqual(typeof firstBlog.user, 'object', 'User field should be an object (populated)')
      assert(firstBlog.user.username, 'User object should have a username property')
      assert(firstBlog.user.name, 'User object should have a name property')
      assert(firstBlog.user.id, 'User object should have an id property')
      assert.strictEqual(firstBlog.user.id.toString(), testUser.id.toString(), 'Populated user ID should match the test user ID')
    })
  })


  //* Tests para POST /api/blogs (añadir blogs)
  describe('addition of a new blog', () => {
    // Éxito al agregar con token válido
    test('succeeds with valid data and a valid token', async () => {
      const newBlog = {
        title: 'New Blog with Auth',
        author: 'Auth Test',
        url: 'http://example.com/auth-blog',
        likes: 5
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`) // <--- ¡AÑADE EL TOKEN del testUser!
        .send(newBlog)
        .expect(201) // Espera 201 Created
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1, 'Number of blogs should increase by one')
      const titles = blogsAtEnd.map(b => b.title)
      assert(titles.includes(newBlog.title), 'New blog title should be in the database')

      const userInDb = await User.findById(testUser._id) // Vuelve a obtener el usuario de la DB
      assert(userInDb.blogs.map(b => b.toString()).includes(blogsAtEnd[blogsAtEnd.length - 1].id), 'Blog reference should be added to user')
    })

    // Test 4.23: Falla si no hay token (para POST)
    test('fails with statuscode 401 if token is missing when adding a blog', async () => {
      const newBlog = {
        title: 'Blog without token',
        author: 'No Auth',
        url: 'http://example.com/no-token-blog',
        likes: 0
      }

      await api
        .post('/api/blogs')
        .send(newBlog) // No set('Authorization')
        .expect(401) // Espera 401 Unauthorized
        .expect('Content-Type', /application\/json/)
        .expect(res => assert.strictEqual(res.body.error, 'token invalid or missing', 'Error message should indicate missing token'))

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length, 'Number of blogs should not change')
    })

    // Test 4.23: Falla si el token es inválido (para POST)
    test('fails with statuscode 401 if token is invalid when adding a blog', async () => {
      const newBlog = {
        title: 'Blog with invalid token',
        author: 'Bad Auth',
        url: 'http://example.com/bad-token',
        likes: 0
      }
      const invalidToken = 'invalid-jwt-string.that-fails.verification' // Token malformado o firma incorrecta

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)
        .expect(res => assert(res.body.error.includes('token invalid'), 'Error message should indicate invalid token'))


      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length, 'Number of blogs should not change')
    })

    // Falla si los datos son inválidos (NO tiene que ver con token, es validación de Mongoose)
    test('fails with status code 400 if data invalid', async () => {
      const newBlog = {
        author: 'Invalid Data', // Faltan title y url (required)
        likes: 0
      }
      // Este test debe pasar la autenticación (enviar un token válido)
      // para que el error de validación de Mongoose sea el que se genere.
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`) // Proporciona un token válido
        .send(newBlog)
        .expect(400) // Espera 400 Bad Request por validación de Mongoose
        .expect('Content-Type', /application\/json/)
        .expect(res => assert(res.body.error.includes('Blog validation failed'), 'Error should be a Mongoose validation error'))

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })


  //* Tests para DELETE /api/blogs/:id (eliminar blogs)
  describe('deletion of a blog', () => {
    // Test 4.21: Éxito al eliminar con token del creador
    test('succeeds with status code 204 if id is valid and user is creator', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0] // El primer blog de los iniciales pertenece a testUser

      // Asegúrate de que el blog pertenece al testUser
      assert.strictEqual(blogToDelete.user._id.toString(), testUser._id.toString(), 'Blog should belong to testUser for this test')

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${token}`) // <--- ¡TOKEN VÁLIDO DEL CREADOR!
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1, 'Number of blogs should decrease by one')

      const titles = blogsAtEnd.map(r => r.title)
      assert(!titles.includes(blogToDelete.title), 'Deleted blog should not be in DB')

      const userInDb = await User.findById(testUser._id) // Vuelve a obtener el usuario
      assert(!userInDb.blogs.map(b => b.toString()).includes(blogToDelete.id), 'Blog reference should be removed from user')
    })

    // Test 4.21: Falla si no hay token (para DELETE)
    test('deletion fails with status code 401 if token is missing', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .expect(401) // Espera 401 Unauthorized
        .expect('Content-Type', /application\/json/)
        .expect(res => assert.strictEqual(res.body.error, 'token invalid or missing', 'Error message should indicate missing token'))

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length, 'Number of blogs should not change')
    })

    // Test 4.21: Falla si el token es inválido (para DELETE)
    test('deletion fails with status code 401 if token is invalid', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]
      const invalidToken = 'not.a.real.jwt' // Token malformado

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
        .expect(res => assert(res.body.error.includes('token invalid'), 'Error message should indicate invalid token'))

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length, 'Number of blogs should not change')
    })

    // Test 4.21: Falla si el token es de otro usuario (Forbidden)
    test('deletion fails with status code 403 if user is not the creator', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0] // Este blog pertenece a 'testUser'

      // otherToken es el token del 'otherUser' que NO es el creador del blog
      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${otherToken}`) // <--- ¡TOKEN DE OTRO USUARIO!
        .expect(403) // Espera 403 Forbidden
        .expect('Content-Type', /application\/json/)
        .expect(res => assert.strictEqual(res.body.error, 'user not authorized to delete this blog', 'Error message should indicate forbidden'))

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length, 'Number of blogs should not change')
    })

    // Eliminación de blog inexistente (debe pasar la autenticación)
    test('deletion fails with status code 204 if id does not exist', async () => {
      const validNonexistingId = await helper.nonExistingId()
      // Proporciona un token válido para pasar la autenticación
      await api
        .delete(`/api/blogs/${validNonexistingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204) // Se espera 204 No Content si no se encuentra
    })

    // ID malformado (debe pasar la autenticación)
    test('deletion fails with status code 400 id is invalid', async () => {
      const invalidId = '5a3d5da59070081a82a3445' // ID con formato incorrecto
      await api
        .delete(`/api/blogs/${invalidId}`)
        .set('Authorization', `Bearer ${token}`) // Proporciona un token válido
        .expect(400) // Espera 400 Bad Request por ID malformado
    })
  })

}) // FIN del describe('Blog API tests')


// --- Hook after (cierra la conexión a la DB después de todos los tests) ---
after(async () => {
  await mongoose.connection.close()
  console.log('--- mongoose connection closed after tests ---')
})
