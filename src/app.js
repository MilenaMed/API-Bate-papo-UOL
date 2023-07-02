import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();

//Ferramentas
app.use(cors())
app.use(express.json())
dotenv.config()

//Mongo
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
    mongoClient.connect()
    console.log("Conectou")
    db = mongoClient.db()
    console.log('Criou')
}
catch (err) {
    console.log(err.message)
}


//Porta
const porta = 5000;
app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));