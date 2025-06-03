const { test, describe } = require('node:test') // Importa test y describe de node:test
const assert = require('node:assert') // Importa la librería assert
const listHelper = require('../utils/list_helper') // Importa el módulo listHelper

// Define un bloque de descripción para agrupar pruebas relacionadas con listHelper
describe('list helper', () => {
  // Caso de prueba para la función dummy
  test('dummy returns one', () => {
    const blogs = [] // Define un array vacío de blogs como parámetro de prueba

    const result = listHelper.dummy(blogs) // Llama a la función dummy
    assert.strictEqual(result, 1) // Verifica que el resultado sea estrictamente igual a 1
  })
})