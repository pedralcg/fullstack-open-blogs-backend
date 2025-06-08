
const { test, after, beforeEach } = require('node:test') // Importa ganchos de prueba
const assert = require('node:assert') // Importa la librería de aserciones
const supertest = require('supertest') // Importa SuperTest
const mongoose = require('mongoose') // Importa Mongoose para cerrar la conexión

const helper = require('./test_helper') // Importa tus funciones auxiliares de prueba
const app = require('../app') // Importa tu aplicación Express

// Envuelve tu aplicación Express con SuperTest para poder hacer peticiones simuladas
const api = supertest(app)

//! Configuración antes de CADA prueba
beforeEach(async () => {
  // Obtén el modelo 'Blog' de la instancia global de Mongoose (ya registrada por app.js)
  const Blog = mongoose.model('Blog') // Obtiene el modelo Blog de Mongoose aquí
  await Blog.deleteMany({}) // Limpia la colección de blogs antes de cada test
  console.log('--- cleared blogs collection for test ---')

  // Inserta los blogs iniciales definidos en test_helper.js en la DB de prueba
  await Blog.insertMany(helper.initialBlogs)
  console.log('--- inserted initial blogs for test ---')
})

//* Prueba 4.8: GET /api/blogs
test('blogs are returned as json and have the correct amount', async () => {
  const response = await api
    .get('/api/blogs') // Realiza una petición GET a la API de blogs
    .expect(200) // Espera un código de estado HTTP 200 OK
    .expect('Content-Type', /application\/json/) // Espera que el Content-Type sea JSON

  // Verifica que el número de blogs devueltos sea igual al número de blogs iniciales que insertamos
  assert.strictEqual(response.body.length, helper.initialBlogs.length)

  console.log('--- blogs GET test passed ---')
})

//* Prueba 4.9: Verificar la propiedad 'id'
test('all blogs have a unique identifier named id', async () => {
  const response = await api.get('/api/blogs') // Obtiene todos los blogs

  response.body.forEach(blog => {
      // Comprueba que 'id' existe y es truthy
    assert.ok(blog.id, 'Blog object should have an id property')
    // Comprueba que '_id' no existe
    assert.strictEqual(blog._id, undefined, 'Blog object should NOT have an _id property')
  })

  console.log('--- blogs id property test passed ---') // Log para depuración
})

//! Configuración después de TODAS las pruebas
after(async () => {
  await mongoose.connection.close() // Cierra la conexión de Mongoose después de todas las pruebas
  console.log('--- mongoose connection closed after tests ---') // Log para depuración
})