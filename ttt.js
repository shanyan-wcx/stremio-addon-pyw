const fs = require('fs')
const cheerio = require('cheerio')
const request = require('sync-request')

var id = 'tt7016936:1:1'
var streams = []
var baseurl = 'https://pianyuan.org'
var cookie = 'security_session_verify=a17b9f2b6ba8d229900ff60c0628ec5b; PHPSESSID=kidm0eie87ooda08e14ku257r1; py_loginauth=WyJzaGFueWFud2N4IiwxNjcwMjI1MjAyLCIzN2MzNDhhYjBjM2RiZjc1Il0='

var test = undefined
if(typeof test === 'string'){
    var url =baseurl +test
    var res = request('POST', url, {
        headers: {
            'cookie': cookie,
        },
    })
    if (res.statusCode === 200) {
        fs.writeFileSync('./1.html',res.getBody('utf8'))
    }
}else{
    console.log("url不存在")
}
