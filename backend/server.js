const express = require("express");

const app = express();
app.use(express.json());

const clientesRoutes = require("./routes/clientes.routes");

app.use("/clientes", clientesRoutes);

const PORT = 3000;

app.get("/", (req, res) => {
    res.send("OrçaFácil API funcionando!");
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
