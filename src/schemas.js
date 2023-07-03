import joi from "joi"

//Joi
const participantes = joi.object({
    name: joi.string().min(1).required(),
});

const mensagem = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
});

export {participantesSchema, mensagemSchema}