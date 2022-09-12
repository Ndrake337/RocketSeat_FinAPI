const express = require('express')
const { v4: uuidv4 } = require("uuid")

const app = express()

app.use(express.json())

const custumers = []

/**
 * cpf - string
 * name - string
 * id - uuid //Será gerado pela aplicação - Identificador Único Universal
 * statment - [] //extrato / lançamentos que a conta vai ter - Não necessariamente será usado na criação da conta, mas deve ser criado 
 */

//Middleware - para definirmos que a função é um middleware temos 3 parametros - Request, Response e Next, sendo o Next, o que define se middleware segue ou se para 
function verifyIfExistsAccountCPF(request, response, next) {
    const {cpf} = request.headers;

    //diferente do some a função find retorna o objeto no array ao invés de dizer se existe ou não
    const customer = custumers.find(customer => customer.cpf === cpf)

    if(!customer ) {
        return response.status(400).json({error: "Customer Not Founded"})
    }

    //usando a request do middleware para armazenar meu cliente
    request.customer = customer

    //se passa na validação do middleware o mesmo segue para o resto da API
    return next()
}

function getbalance(statement){
    //transforma todas as informações em apenas um valor, recebe um acumulador e um iterador
    const balance = statement.reduce((acc, operation) =>{
        if(operation.type == 'credit'){
            return acc + operation.amount
        }
        else{
            return acc - operation.amount
        }
    }, 0)
    return balance        
}

app.post("/account", (request,response) =>{
    //desestruturação
    const {cpf, name} = request.body;

    //validando CPF, função some itera o array, função retorna True ou False
    const customerAlreadyExists = custumers.some((custumer) => custumer.cpf === cpf)

    if(customerAlreadyExists === true){
        return response.status(400).json({error: "Custumer Already Exists"})
    }

    custumers.push({
        name,
        id: uuidv4(),
        cpf,
        statement: []
    })

    return response.status(201).send()
})

//caso todas as rotas a partir desta linha devam usar o middleware em questão usamos o app.use(verifyIfExistsAccountCPF)
//ou podemos passar o middleware entre o nome da rota e o (request, response), caso apenas essa rota precise usar este recurso
app.get("/statement/", verifyIfExistsAccountCPF, (request,response) =>{
    const {customer} = request
    return response.json(customer.statement)
})

app.post("/deposit", verifyIfExistsAccountCPF, (request,response) =>{
    const { description, amount } = request.body;

    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation)
    
    return response.status(201).send()
})


app.post("/withdraw", verifyIfExistsAccountCPF, (request,response) =>{
    const { amount } = request.body
    const { customer } = request

    const balance = getbalance(customer.statement)

    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()

})

app.get("/statement/:date", verifyIfExistsAccountCPF, (request,response) =>{
    const {customer} = request
    const { date } = request.query

    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())

    return response.json(statement)
})

app.put("/account", verifyIfExistsAccountCPF, (request, response) =>{
    const { name } = request.body
    const {customer} = request

    customer.name = name

    return response.status(201).send()
})

app.get("/account", verifyIfExistsAccountCPF, (request,response) =>{
    const { customer } = request

    return response.json(customer)
})

app.delete("/account", verifyIfExistsAccountCPF, (request, response) =>{
    const { customer } = request

    // splice
    custumers.splice(customer, 1)

    return response.status(200).json(custumers)
})

app.get("/balance", verifyIfExistsAccountCPF, (request, response) =>{
    const {customer} = request
    const balance = getbalance(customer.statement)

    return response.json(balance)
})

app.listen(3333)