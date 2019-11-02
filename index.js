const axios = require("axios")
const bullshitUrl = "https://koodihaaste-api.solidabis.com/bullshit"
const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJidWxsc2hpdCI6ImJ1bGxzaGl0IiwiaWF0IjoxNTcyNTUwMTU0fQ.ZQ21Hz5HBTN9WCw1FIQj5xumFfJvFYM9ldcV9Ijdvr4'
const charset = String("abcdefghijklmnopqrstuvwxyzåäö").split('')

const express = require('express')


axios.get(bullshitUrl, { headers: { "Authorization": `Bearer ${jwtToken}` } }).then(response => {
    let data = []
    const wordlist = readWordlist()

    response.data.bullshits.forEach(item => {
        data.push({ original: item.message, index: response.data.bullshits.indexOf(item) })
    })

    data.forEach(msg => {
        for (shift = 1; shift < charset.length; shift++) {
            let decrypted = decrypt(msg.original, shift, charset)
            //Sanoissa ei saa esiintyä mahdottomia kirjainyhdistelmiä ja kahden sanan pitää löytyä sanakirjasta
            if (!isBullshit(decrypted) && dictionaryWords(wordlist, decrypted) >= 1) {
                msg.decrypted = decrypted
                msg.dictionary = dictionaryWords(wordlist, decrypted)
            }
        }
    })
    webserver(process.env.PORT || 80, data)
})



function webserver(port, data) {
    const app = express()
    let noBs = ''
    data.filter(item => item.decrypted).forEach(item => noBs += '<li>' + item.decrypted + ' ' + item.dictionary + '</li>')
    let bs = ''
    data.filter(item => !item.decrypted).forEach(item => bs += '<li>' + item.original + '</li>')
    let html = `
        <html>
        <head>
        <title>Solidabis koodihaaste</title>
        </head>
        <h1>No bullshit, ${data.filter(item => item.decrypted).length} kpl</h1>
        <ul>
        ${noBs}
        </ul>
        <h1>Bullshit</h1>
        <ul>
        ${bs}
        </ul>
        </html>
    `
    app.get('/', (req, res) => res.send(html))
    app.listen(port, () => console.log(`Server listening on port ${port}!`))
}

function decrypt(text, shift, charset) {
    let result = ''
    text.toLowerCase().split('').forEach(c => {
        let index = charset.indexOf(c)
        if (index != -1) {
            if (index - shift < 0) index += charset.length
            c = charset[index - shift]
        }
        result += c
    })
    if(text[0].toUpperCase() === text[0]) result = result[0].toUpperCase() + result.slice(1) //Ensimmäinen kirjain takaisin isoksi
    return result
}


function isBullshit(text) {
    text = text.toLowerCase()
    text = text.replace(".", '').split(' ')
    for (i = 0; i < text.length; i++) {
        if (text[i].match(/[aeiouyåäö]{3}/g)) return true //Ei kolmea vokaalia peräkkäin
        if (text[i].match(/[bcdfghjklmnpqrstvwxz]{4}/g)) return true //Ei neljää konsonanttia peräkkäin
        if (text[i].match(/[bcdfghjklmnpqrstvwxz]{2}$/g) != null) return true //Sana ei voi loppua kahteen konsonanttiin
        if (text[i].match(/fz/g)) return true // 'fz' ei missään suomalaisessa sanassa
    }
    return false
}

function dictionaryWords(wordlist, text) {
    let result = 0
    text = text.toLowerCase()
    text = text.replace('.', '')
    text = text.split(' ')
    //Onko sana suoraan sanakirjassa tai sanasta karsittuna helpot päätteet?
    text.forEach(word => {
        if (wordlist.indexOf(word) != -1 ||
            wordlist.indexOf(word.replace(/ja$/g, '')) != -1 ||
            wordlist.indexOf(word.replace(/n$/g, '')) != -1 ||
            wordlist.indexOf(word.replace(/ssa$/g, '')) != -1
        ) result++
    })
    return result
}

function readWordlist() {
    var data = require('fs').readFileSync('./sanalista.txt', 'utf8')
    data = data.replace('\r', '').split('\n')
    console.log(`Wordlist length ${data.length} words ${data[0]}`);
    return data
}