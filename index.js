const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


const app = express();
const port = process.env.PORT || 3000;

const mongoURI = 'mongodb+srv://davecamp:R8dy0LYFUlCh54lp@cluster0.fdwpzyb.mongodb.net/miapp?retryWrites=true&w=majority';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conexión a MongoDB Atlas exitosa'))
.catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    privilegios: Number,
    autorizacion: String
});
const User = mongoose.model('User', UserSchema);

const contactoSchema = new mongoose.Schema({
    nombre: String,
    correo: String,
    numero: Number,
    mensaje: String,
    nombreempresa: String
});
const Contacto = mongoose.model('Contacto', contactoSchema);

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
        res.redirect('/');
    } catch (error) {
        console.log(error);
        res.redirect('/register');
    }
});

app.use(session({
    secret: 'secreto',
    resave: false,
    saveUninitialized: false
}));
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/');
    }
};

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.loggedIn = true;
            req.session.username = username; 

            const userData = {
                id: user._id,
                username: user.username,
                privilegios: user.privilegios,
                autorizacion: user.autorizacion
            };
            req.session.userData = userData;
            // console.log(req.session);
            console.log(req.session.userData); 
            console.log(username)
            res.redirect('/vistadatos');
            // res.redirect('/vistadatos');
        } else {
            res.send('Credenciales inválidas');
        }
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            res.status(500).send('Error al cerrar sesión');
        } else {
            res.redirect('/');
        }
    });
});


app.post('/users', requireLogin, async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).send(newUser);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al crear el usuario');
    }
});

// Ruta para mostrar la lista de usuarios
app.get('/users', requireLogin, async (req, res) => {
    try {
        const users = await User.find();
        res.render('users', { users });
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al obtener los usuarios');
    }
});

// Leer un usuario por su ID
app.get('/users/:id', requireLogin, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }
        res.send(user);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al obtener el usuario');
    }
});

// Middleware para editar un usuario
app.get('/users/:id/edit', requireLogin, async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }
        res.render('editUser', { user });
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al buscar el usuario');
    }
});


app.post('/users/:id/edit', requireLogin, async (req, res) => {
    const userId = req.params.id;
    const { username, password, privilegios, autorizacion } = req.body;

    try {
        // Obtener el usuario existente de la base de datos
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }

        // Construir el objeto con los datos actualizados
        const updatedData = {};
        if (username) {
            updatedData.username = username;
        }
        if (password) {
            // Encriptar la nueva contraseña si se proporciona
            updatedData.password = await bcrypt.hash(password, 10);
        }
        if (privilegios) {
            updatedData.privilegios = privilegios;
        }
        if (autorizacion) {
            updatedData.autorizacion = autorizacion;
        }

        // Actualizar el usuario con los datos actualizados
        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, { new: true });
        if (!updatedUser) {
            return res.status(404).send('Usuario no encontrado');
        }

        // Redireccionar a la página de lista de usuarios después de la actualización
        res.redirect('/users');
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al actualizar el usuario');
    }
});

//***************************************************************************************************** */
app.get('/vistadatos', requireLogin, async (req, res) => {
    try {
        const contactos = await Contacto.find();
        res.render('vistadatos', { contactos });
    } catch (err) {
        console.error('Error al obtener contacto:', err);
        res.status(500).send('Error interno del servidor');
    }
});

app.post('/crear', requireLogin, async (req, res) => {
    try {
      const { nombre, correo, numero, mensaje, nombreempresa } = req.body;
      const nuevocontacto = new Contacto({ nombre, correo, numero, mensaje, nombreempresa });
      await nuevocontacto.save();
      console.log("guardado")
      setTimeout(() => {
        res.redirect('/');
      }, 3000);
    } catch (err) {
      console.error('Error al crear un nuevo contacto:', err);
      res.status(500).send('Error interno del servidor');
    }
  });

  app.get('/eliminar/:id', requireLogin, async (req, res) => {
    try {
        await Contacto.findByIdAndDelete(req.params.id);
        // res.status(200).send(alert('Contacto eliminado exitosamente'));
        res.status(200);
        res.redirect('/vistadatos');
    } catch (err) {
        console.error('Error al eliminar el contacto:', err);
        res.status(500).send('Error interno del servidor');
    }
});

app.get('/editar/:id', requireLogin, async (req, res) => {
    try {
        const contacto = await Contacto.findById(req.params.id);
        if (!contacto) {
            return res.status(404).send('Contacto no encontrado');
        }
        res.render('editar', { contacto });
    } catch (err) {
        console.error('Error al editar contacto:', err);
        res.status(500).send('Error interno del servidor');
    }
});

app.post('/actualizar/:id', requireLogin, async (req, res) => {
    try {
        const { nombre, correo, numero, mensaje, nombreempresa } = req.body;
        await Contacto.findByIdAndUpdate(req.params.id, { nombre, correo, numero, mensaje, nombreempresa });
        res.redirect('/vistadatos');
    } catch (err) {
        console.error('Error al actualizar el contacto:', err);
        res.status(500).send('Error interno del servidor');
    }
});





// Eliminar un usuario
app.post('/users/:id/delete', requireLogin, async (req, res) => {
    const userId = req.params.id;
    try {
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).send('Usuario no encontrado');
        }
        res.redirect('/users');
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al eliminar el usuario');
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
