// [ --------- IMPORTS LOCALES --------- ] //
import ArchivadorProductos from "./src/daos/archivadorDaoProductos.js";
import { optionsMariaDB } from "./src/options/mariaDB.js";
import ArchivadorMensajes from "./src/daos/archivadorDaoMensajes.js";
import { optionsSQLite } from "./src/options/SQLite3.js";
import Mocker from "./src/utils/mocker.js";
const mocker = new Mocker();

// [ --------- IMPORTS NPM --------- ] //
import session from "express-session";
import cookieParser from "cookie-parser";
import express from "express";
import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import MongoStore from "connect-mongo";
const advancedOptions = {useNewUrlParser: true, useUnifiedTopology: true};


// [ --------- CONFIGURACION --------- ] //

// >Servidor
const app = express();
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// >Cookies y sesiones

app.use(cookieParser());
app.use(
    session({
        store: MongoStore.create({
            mongoUrl: "mongodb+srv://dera:xxxx@cluster0.78ayu.mongodb.net/?retryWrites=true&w=majority",
            mongoOptions: advancedOptions
        }),
        secret: "andywarhol",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 600000,
        },
    })
);

// >DBs
const archMensajes = new ArchivadorMensajes("chat", optionsSQLite);
archMensajes.chequearTabla();
const archProductos = new ArchivadorProductos("productos", optionsMariaDB);
archProductos.chequearTabla();


// >Motor de plantillas
app.use(express.static("./public"));
app.set("views", "./src/views");
app.set("view engine", "ejs");

// >Inicializador

const inicializarProductos = () => {
    archProductos.save({
        title: "Onigiri",
        price: 200,
        thumbnail:
            "https://cdn3.iconfinder.com/data/icons/food-solid-in-the-kitchen/512/Onigiri-256.png",
    });

    archProductos.save({
        title: "Biological Warfare",
        price: 800000000,
        thumbnail: "https://cdn0.iconfinder.com/data/icons/infectious-pandemics-1/480/12-virus-256.png",
    });

    archProductos.save({
        title: "Eg",
        price: 120,
        thumbnail:
            "https://cdn3.iconfinder.com/data/icons/food-solid-in-the-kitchen/512/Egg_and_bacon-256.png",
    });
};

// inicializarProductos();

// [ --------- MIDDLEWARE --------- ] //

const isLogged = (req, res, next) => {
    if (req.session.nombreUsuario) next();
    else res.redirect("/login");
};

// [ --------- RUTAS --------- ] //

app.get("/", isLogged, async (req, res) => {
    try {
        const productos = await archProductos.getAll();
        const mensajes = await archMensajes.read();
        res.status(200).render("productosForm", {
            prods: productos,
            mensajes: mensajes,
            nombreUsuario: req.session.nombreUsuario,
        });
    } catch (e) {
        res.status(500).send(e);
    }
});

app.get("/api/productos-test", async (req, res) => {
    try {
        const productos = mocker.generarProductos(5);
        const mensajes = await archMensajes.read();
        res.status(200).render("productosForm", {
            prods: productos,
            mensajes: mensajes,
        });
    } catch (e) {
        res.status(500).send(e);
    }
});

app.get("/login", (req, res) => {
    try {
        if (req.session.nombreUsuario) {
            res.redirect("/");
        } else {
            res.status(200).render("login");
        }
    } catch (e) {
        res.status(500).send(e);
    }
});

app.get("/datos", (req, res) => {
    res.json(req.session);
});

app.post("/login", (req, res) => {
    try {
        const nombreUsuario = req.body.nombreUsuario;
        req.session.nombreUsuario = nombreUsuario;
        res.status(200).redirect("/");
    } catch (e) {
        req.status(500).send(e);
    }
});

app.post("/logout", isLogged, (req, res) => {
    try {
        const nombreUsuario = req.session.nombreUsuario;
        req.session.destroy((err) => {
            res.status(200).render("logout", { nombreUsuario: nombreUsuario });
        });
    } catch (e) {
        res.status(500).send(e);
    }
});
// [ --------- CORRER EL SERVIDOR --------- ] //

const PORT = 8080;
httpServer.listen(PORT, () => console.log("Lisstooooo ", PORT));

// [ --------- SOCKET --------- ] //

io.on("connection", async (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id.substring(0, 4)}`);
    socket.on("productoAgregado", async (producto) => {
        // console.log(producto);
        const respuestaApi = await archProductos.save(producto);
        console.log({ respuestaApi });
        // respuestaApi es el ID del producto, si no es un número, es un error (ver API)
        if (!respuestaApi) {
            socket.emit("productoInvalido", { error: "Producto inválido" });
        } else {
            console.log(respuestaApi, "producto valido");
            io.sockets.emit("productosRefresh", await archProductos.getAll());
        }
    });

    socket.on("mensajeEnviado", async (mensaje) => {
        await archMensajes.save(mensaje);
        io.sockets.emit("chatRefresh", mensaje);
    });
});
