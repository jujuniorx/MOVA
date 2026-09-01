const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Rota de clientes funcionando!");
});

router.post("/", (req, res) => {
    const cliente = req.body;
    res.json(cliente);
});

module.exports = router;