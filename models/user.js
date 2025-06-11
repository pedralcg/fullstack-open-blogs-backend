
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Asegura que el nombre de usuario sea único
    minlength: 3 // Requiere un mínimo de 3 caracteres para el nombre de usuario
  },
  name: String,
  passwordHash: String, // Aquí almacenaremos el hash de la contraseña
  blogs: [ // Relación: un usuario puede tener múltiples blogs
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog' // Referencia al modelo 'Blog'
    }
  ],
})

// Configura el método toJSON para transformar el objeto antes de enviarlo como JSON
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString() // Cambia _id a id (string)
    delete returnedObject._id // Elimina la propiedad _id
    delete returnedObject.__v // Elimina la propiedad __v (versión de Mongoose)
    // ¡IMPORTANTE! No enviar el hash de la contraseña al cliente
    delete returnedObject.passwordHash
  }
})

module.exports = mongoose.model('User', userSchema)