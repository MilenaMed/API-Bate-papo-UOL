import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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
    const { user } = request.headers

    const validacaomensagem = mensagemSchema.validate({ ...request.body, from: user })
    if (validacaomensagem.error) {
        return response.status(422).send("Erro na validação da mensagem")
    }

    const nomeExiste = await db.collection("participants").findOne({ name: user })
    if (!nomeExiste) {
        return response.status(422).send("Nome de usuário não encontrado")
    }

    try {
        const mensagemEnviada = {
            from: user,
            ...request.body,
            time: dayjs().format('HH:mm:ss')
        }

        await db.collection("messages").insertOne(mensagemEnviada)
        return response.status(201).send("Mensagem enviada!");

    } catch (err) {
        return response.status(500).send(err.message)
    }
})

//GET - messages 

app.get('/messages', async (request, response) => {
    const { limit } = request.query
    const { user } = request.headers
    const numeroLimite = Number(limit)

    if (limit !== undefined && (numeroLimite <= 0 || isNaN(limit))) {
        return response.sendStatus(422)
    }

    try {

        const mensagens = await db.collection("messages").find({
            $or: [{ from: user },
            { to: { $in: ["Todos", user] } },
            { type: "message" }]
        })
            .sort(({ $natural: -1 }))
            .limit(limit === undefined ? 0 : numeroLimite)
            .toArray()

        return response.status(200).send(mensagens)
    } catch (err) {
        return response.status(422).send("Erro: Não foi possível pegar mensagens")
    }
})

// POST - Status
app.post("/status", async (request, response) => {
    const { user } = request.headers


    try {
        const userExiste = await db.collection("participants").findOne({ name: user })
        if (!userExiste) {
            return response.status(404).send("Usuário não encontrado")
        }

        await db.collection("participants").updateOne(
            { name: user }, { $set: { lastStatus: Date.now() } }
        )
        response.sendStatus(200)
    } catch (err) {
        response.status(500).send(err.message)
    }
})

//Desconectar inativos
async function remoçãoAutomática() {
    try {
        const users = await db.collection("participants").find().toArray()
        users.forEach(dado => {
            const tempoAtualizado = Date.now() - dado.lastStatus

            if (tempoAtualizado > 10000) {
                const mensagemSaida = {
                    from: dado.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format('HH:mm:ss')
                }

                db.collection("participants").deleteOne({ _id: ObjectId(dado._id) })
                db.collection("messages").insertOne(mensagemSaida)
            }
        });
    } catch (err) {
        response.status(500).send(err.message)
    }

}

setInterval(remoçãoAutomática, 15000)


//Porta
const porta = 5000
app.listen(porta, () => console.log(`Servidor rodando na porta ${porta}`));
