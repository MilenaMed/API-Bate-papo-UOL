import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi"
import dayjs from "dayjs"

const app = express();

//Ferramentas
app.use(cors())
app.use(express.json())
dotenv.config()

//Mongo
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    await mongoClient.connect()
    console.log("Conectou")
}
catch (err) {
    console.log(err.message)
}

const db = mongoClient.db()

//Joi
const participantesSchema = joi.object({
    name: joi.string().required(),
});

const mensagemSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
});

//Globais

//Post - Participantes

app.post("/participants", async (request, response) => {
    const name = request.body

    const validacao = participantesSchema.validate(request.body);
    if (validacao.error) {
        return response.status(422).send("Participante inválido")
    }

    //Novo usúario

    try {
        const nomeExiste = await db.collection("participants").findOne({ name: name })

        if (nomeExiste) {
            return response.status(409).send("Nome de usuário em uso")
        }

        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        })

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(Date.now()).format('HH:mm:ss')
        })

        response.sendStatus(201)

    } catch (err) {
       response.status(422).send(err.message)
    }
})

//GET - Participantes
app.get('/participants', async (request, response) => {
    try {
        const usuarios = await db.collection("participants").find().toArray()
        return response.status(200).send(usuarios)
    } catch (err) {
        return response.status(422).send(err.message)
    }
})

//POST - Mensagens


//Porta
const porta = 5000;
app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));
