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

const mongoClient = new MongoClient(process.env.DATABASE_URL)
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
    name: joi.string().required()
});

const mensagemSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
});

//Globais

//Post - Participantes

app.post("/participants", async (request, response) => {
    const { name } = request.body

    const validacao = participantesSchema.validate(request.body, { abortEarly: false });
    if (validacao.error) {
        return response.status(422).send("Participante inválido")
    }

    //Novo usúario

    try {
        const nomeExiste = await db.collection("participants").findOne({ name })

        if (nomeExiste) {
            return response.status(409).send("Nome de usuário em uso")
        }
        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        })

        const mensagemEntrada = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(Date.now()).format('HH:mm:ss')
        }

        await db.collection("messages").insertOne(mensagemEntrada)
        response.sendStatus(201)

    } catch (err) {
        response.status(500).send(err.message)
    }
})

//GET - Participantes
app.get('/participants', async (request, response) => {
    try {
        const usuarios = await db.collection("participants").find().toArray()
        response.status(200).send(usuarios)
    } catch (err) {
        return response.status(500).send(err.message)
    }
})

//POST - Mensagens
app.post('/messages', async (request, response) => {
    const mensagemEnviada = request.body;
    const user = request.headers

    const validacaomensagem = mensagemSchema.validate(mensagemEnviada)
    if (validacaomensagem.error) {
        return response.status(422).send("Erro na validação da mensagem")
    }

    const nomeExiste = await db.collection("participants").findOne({ name: user })
    if (!nomeExiste) {
        return response.status(422).send("Nome de usuário não encontrado")
    }

    try {
        await db.collection("messages").insertOne({
            ...request.body,
            from: user,
            time: dayjs().format('HH:mm:ss')
        })
        return response.status(201).send("Mensagem enviada!");
    } catch (err) {
        return response.status(500).send(err.message)
    }
})

//GET - messages 

app.get('/messages', async (request, response) => {
    const limite = parseInt(request.query.limit)
    const usuario = request.headers.user

    const mensagens = await db.collection("messages").find({
        $or: [
            { to: "Todos" },
            { to: usuario },
            { from: usuario },
            { type: "message" }
        ]
    }).toArray()

    try {
        if (limite) {
            if (limite <= 0 || isNaN(limite)) {
                return response.status(422).send("Limite inválido")
            }
        } else if (limite > 0) {
            return response.send(mensagens.slice(-limit).reverse())
        }

        return response.status(200).send([...mensagens].reverse())
    } catch (err) {
        return response.status(422).send("Erro: Não foi possível pegar mensagens")
    }
})

//Porta
const porta = 5000;
app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));
