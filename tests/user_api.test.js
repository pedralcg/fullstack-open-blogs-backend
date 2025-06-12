
const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const app = require('../app') // Importa tu aplicación Express
const api = supertest(app) // Envuelve la app con Supertest

const helper = require('./test_helper') // Importa tus funciones auxiliares
const User = require('../models/user') // Importa el modelo User


//! --- Configuración antes de CADA prueba de usuario ---
beforeEach(async () => {
  await User.deleteMany({}) // Limpia la colección de usuarios
  console.log('--- cleared users collection for test ---')
  //! Ojo!! userObjects es un array de promesas --> Solución: map devuelva la promesa de la operación save()
  // Crear instancias de User, hashear contraseñas, y luego guardar.
  // Promise.all esperará a que todas las promesas de userInstance.save() se resuelvan.
  const savedUserPromises = helper.initialUsers.map(async (user) => {
    const passwordHash = await bcrypt.hash(user.password, 10)
    const userInstance = new User({ username: user.username, name: user.name, passwordHash })
    return userInstance.save() // <--- ¡Guarda la instancia del usuario y devuelve la promesa de guardado!
  })
  await Promise.all(savedUserPromises) // Espera a que todos los usuarios se guarden
  console.log('--- inserted initial users for test ---')
})


describe('User API tests', () => {
  //* --- Prueba 4.16: Creación de usuario exitosa ---
  test('creation succeeds with a fresh username and valid password', async () => {
    const usersAtStart = await helper.usersInDb() // Obtiene usuarios antes del POST

    const newUser = {
      username: 'newvaliduser',
      name: 'New Valid User',
      password: 'newvalidpassword', // Contraseña válida (>= 3 chars)
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201) // Espera 201 Created
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb() // Obtiene usuarios después del POST
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1, 'Number of users should increase by one')

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username), 'New username should be in the database')
  })

  //* --- Prueba 4.16: Falla si username es duplicado ---
  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb() // usersAtStart ya contiene initialUsers

    const newUser = {
      username: helper.initialUsers[0].username, // Usamos un username que ya existe
      name: 'Existing User Name',
      password: 'validpassword',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400) // Espera 400 Bad Request
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length, 'Number of users should not change')
    // Verifica el mensaje de error de unicidad que devuelve tu errorHandler
    assert(result.body.error.includes('expected `username` to be unique'), 'Error message should indicate unique username constraint')
  })

  //* --- Prueba 4.16: Falla si username es muy corto ---
  test('creation fails with statuscode 400 if username is too short', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'ab', // Menos de 3 caracteres
      name: 'Short Username',
      password: 'validpassword',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400) // Espera 400 Bad Request
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length, 'Number of users should not change')
    // Verifica el mensaje de error de longitud mínima que devuelve tu errorHandler
    assert(result.body.error.includes('Path `username` (`ab`) is shorter than the minimum allowed length (3)'), 'Error message should indicate username length constraint')
  })

  //* --- Prueba 4.16: Falla si username falta ---
  test('creation fails with statuscode 400 if username is missing', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      // username: 'missing', // Falta el username
      name: 'Missing Username',
      password: 'validpassword',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400) // Espera 400 Bad Request
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length, 'Number of users should not change')
    // Verifica el mensaje de error de 'required' que devuelve tu errorHandler
    assert(result.body.error.includes('Path `username` is required'), 'Error message should indicate username is required')
  })

  //* --- Prueba 4.16: Falla si password es muy corta (validación en el controlador) ---
  test('creation fails with statuscode 400 if password is too short', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'validuserX',
      name: 'Short Password User',
      password: 'ab', // Menos de 3 caracteres
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400) // Espera 400 Bad Request
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length, 'Number of users should not change')
    // Verifica el mensaje de error personalizado de tu controlador
    assert(result.body.error.includes('password must be at least 3 characters long'), 'Error message should indicate password length constraint')
  })

  //* --- Prueba 4.16: Falla si password falta (validación en el controlador) ---
  test('creation fails with statuscode 400 if password is missing', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'validuserY',
      name: 'Missing Password User',
      // password: 'missing', // Falta la contraseña
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400) // Espera 400 Bad Request
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length, 'Number of users should not change')
    // Verifica el mensaje de error personalizado de tu controlador
    assert(result.body.error.includes('password must be at least 3 characters long'), 'Error message should indicate password is required')
  })
})

//! --- Configuración después de TODAS las pruebas ---
after(async () => {
  await mongoose.connection.close() // Cierra la conexión de Mongoose
  console.log('--- mongoose connection closed after tests ---')
})