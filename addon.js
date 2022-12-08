const cheerio = require('cheerio')
const request = require('sync-request')
const { addonBuilder } = require("stremio-addon-sdk")

const manifest = {
	"id": "community.",
	"version": "1.0.0",
	"catalogs": [],
	"resources": [
		"stream"
	],
	"types": [
		"movie",
		"series"
	],
	"name": "片源网",
	"description": "来自片源网的电影和剧集",
	"idPrefixes": [
		"tt"
	],
	"behaviorHints": {
		"configurable": true,
		"configurationRequired": true
	},
	"config": [
		{
			"key": "cookie",
			"type": "text",
			"title": '请输入你的Cookie：(若没有Cookie,请先到https://pianyuan.org/注册一个账号，然后获取Cookie)',
			"required": true
		},
		{
			"key": "token",
			"type": "text",
			"title": '请输入你的Token：(若没有Token,请先到https://www.myapifilms.com注册一个)',
			"required": true
		}
	]
}
const builder = new addonBuilder(manifest)

builder.defineStreamHandler(async ({ type, id, config }) => {
	console.log("request for streams: " + type + " " + id)
	var baseurl = 'https://pianyuan.org'
	var cookie = config.cookie
	var token = config.token
	var streams = []
	var temp = id.split(':')
	id = temp[0]
	var season = temp[1]
	var episode = temp[2]
	if (type === "movie") {
		streams = await getMovieStreams(baseurl, streams, id, cookie)
		streams = await sortBy(streams)
		console.log(streams)
		return Promise.resolve({ streams: streams })
	} else if (type === "series") {
		streams = await getSeriesStreams(baseurl, streams, id, season, episode, cookie, token)
		streams = await sortBy(streams)
		console.log(streams)
		return Promise.resolve({ streams: streams })
	}
	return Promise.resolve({ streams: [] })
})

async function getMovieStreams(baseurl, streams, id, cookie, type) {
	var res = request('POST', baseurl + `/search?q=${id}`, {
		headers: {
			'cookie': cookie,
		},
	})
	if (res.statusCode != 200) {
		return streams
	}
	var $ = cheerio.load(res.getBody('utf8'))
	var url1 = $('.nomt').children('a').attr('href')
	if (url1 === undefined) {
		return streams
	}
	var res1 = request('POST', baseurl + url1, {
		headers: {
			'cookie': cookie,
		},
	})
	if (res1.statusCode != 200) {
		return streams
	}
	var $1 = cheerio.load(res1.getBody('utf8'))
	var items = $1('table')
	var promises = []
	items.each(async function (idx) {
		var temp = $(this).children('tbody').children('tr')
		if (temp.first().children('th').first().text() != '蓝光原盘') {
			temp.each(async function (idx) {
				if ($(this).children('td').children('a').attr('href') != undefined) {
					var url2 = $1(this).children('td').children('a').attr('href')
					var res2 = request('POST', baseurl + url2, {
						headers: {
							'cookie': cookie,
						},
					})
					if (res2.statusCode != 200) {
						return
					}
					var $2 = cheerio.load(res2.getBody('utf8'))
					var firstfile = $2('.fileTree').children('li').text().substring(0, 6)
					if (firstfile.indexOf('BDMV') === -1) {
						var size = ''
						var magnet = $2('.tdown').children('a').eq(1).attr('href')
						var title = $2('.fileTree').children('p').text()
						var temp_video = $2('.fileTree').children('li')
						temp_video.each(async function (idx) {
							var alt = $(this).children('span').attr('alt')
							if (alt === '视频文件') {
								fileIdx = idx
								size = $(this).text().replace(/.*\(/, '').replace(/\)/, '')
								promises.push(format(magnet, title, size, fileIdx, streams, type))
							}
						})
					}
				}
			})
		}
	})
	await Promise.all(promises)
	return streams
}

async function getSeriesStreams(baseurl, streams, id, season, episode, cookie, token, type) {
	var episode_ = episode
	if (episode * 1 < 10) {
		episode_ = '0' + episode
	}
	if (season * 1 === 0) {
		return streams
	} else if (season * 1 != 1) {
		var res0 = request('GET', `https://www.myapifilms.com/imdb/idIMDB?idIMDB=${id}&token=${token}&format=json&language=zh-cn&aka=0&business=0&seasons=1&seasonYear=0&technical=0&trailers=0&movieTrivia=0&awards=0&moviePhotos=0&movieVideos=0&actors=0&biography=0&uniqueName=0&filmography=0&bornDied=0&starSign=0&actorActress=0&actorTrivia=0&similarMovies=0&goofs=0&keyword=0&quotes=0&fullSize=0&companyCredits=0&filmingLocations=0&directors=1&writers=1`)
		var temp = JSON.parse(res0.getBody('utf8')).data.movies[0].seasons.seasonsBySeason
		var sea = -1
		for (i in temp) {
			if (temp[i].season.toString() === season) {
				sea = i
				break
			}
		}
		if (sea != -1) {
			id = temp[sea].episodes[0].idIMDB
		}
	}
	var res = request('POST', baseurl + `/search?q=${id}`, {
		headers: {
			'cookie': cookie,
		},
	})
	if (res.statusCode != 200) {
		return streams
	}
	var $ = cheerio.load(res.getBody('utf8'))
	var url1 = $('.nomt').children('a').attr('href')
	if (url1 === undefined) {
		return streams
	}
	var res1 = request('POST', baseurl + url1, {
		headers: {
			'cookie': cookie,
		},
	})
	if (res1.statusCode != 200) {
		return streams
	}
	var $1 = cheerio.load(res1.getBody('utf8'))
	var items = $1('table')
	var promises = []
	items.each(async function (idx) {
		var temp = $(this).children('tbody').children('tr')
		if (temp.first().children('th').first().text() != '蓝光原盘') {
			temp.each(async function (idx) {
				var epi = $(this).children('td').first().text()
				var epi_ = epi.replace(/第/, '').replace(/集/, '') * 1
				if (epi === '全集' && $1(this).children('td').children('a').attr('href') != undefined) {
					var url2 = $1(this).children('td').children('a').attr('href')
					var res2 = request('POST', baseurl + url2, {
						headers: {
							'cookie': cookie,
						},
					})
					if (res2.statusCode != 200) {
						return
					}
					var $2 = cheerio.load(res2.getBody('utf8'))
					var firstfile = $2('.fileTree').children('li').text().substring(0, 6)
					if (firstfile.indexOf('BDMV') === -1) {
						var size = ''
						var magnet = $2('.tdown').children('a').eq(1).attr('href')
						var title = $2('.fileTree').children('p').text()
						var temp_video = $2('.fileTree').children('li')
						temp_video.each(async function (idx) {
							var fileIdx = null
							var alt = $(this).children('span').attr('alt')
							if (alt === '视频文件') {
								var filename = $(this).text().replace(/\(.*\)/, '')
								var re = new RegExp(`E|e0*${episode}`)
								if (filename.match(re)) {
									fileIdx = idx
									size = $(this).text().replace(/.*\(/, '').replace(/\)/, '')
									promises.push(format(magnet, title, size, fileIdx, streams, type))
								}
							}
						})
					}
				} else if (epi_ === episode * 1 && $1(this).children('td').children('a').attr('href') != undefined && !$1(this).children('td').children('a').text().match(/EP01-/)) {
					var url2 = $1(this).children('td').children('a').attr('href')
					var res2 = request('POST', baseurl + url2, {
						headers: {
							'cookie': cookie,
						},
					})
					if (res2.statusCode != 200) {
						return
					}
					var $2 = cheerio.load(res2.getBody('utf8'))
					var firstfile = $2('.fileTree').children('li').text().substring(0, 6)
					if (firstfile.indexOf('BDMV') === -1) {
						var size = ''
						var magnet = $2('.tdown').children('a').eq(1).attr('href')
						var title = $2('.fileTree').children('p').text()
						var temp_video = $2('.fileTree').children('li')
						temp_video.each(async function (idx) {
							var fileIdx = null
							var alt = $(this).children('span').attr('alt')
							if (alt === '视频文件') {
								var filename = $(this).text().replace(/\(.*\)/, '')
								var re = new RegExp(`E|e0*${episode}`)
								if (filename.match(re)) {
									fileIdx = idx
									size = $(this).text().replace(/.*\(/, '').replace(/\)/, '')
									promises.push(format(magnet, title, size, fileIdx, streams, type))
								}
							}
						})
					}
				} else if (epi_ === 1 && $1(this).children('td').children('a').attr('href') != undefined && ($1(this).children('td').children('a').text().match(/EP|ep01-/) || $1(this).children('td').children('a').text().match(/[Ss]\d\d\./))) {
					var url2 = $1(this).children('td').children('a').attr('href')
					var res2 = request('POST', baseurl + url2, {
						headers: {
							'cookie': cookie,
						},
					})
					if (res2.statusCode != 200) {
						return
					}
					var $2 = cheerio.load(res2.getBody('utf8'))
					var firstfile = $2('.fileTree').children('li').text().substring(0, 6)
					if (firstfile.indexOf('BDMV') === -1) {
						var size = ''
						var magnet = $2('.tdown').children('a').eq(1).attr('href')
						var title = $2('.fileTree').children('p').text()
						var temp_video = $2('.fileTree').children('li')
						temp_video.each(async function (idx) {
							var fileIdx = null
							var alt = $(this).children('span').attr('alt')
							if (alt === '视频文件') {
								var filename = $(this).text().replace(/\(.*\)/, '')
								var re_ = new RegExp(`${episode_}\\\.`)
								var re = new RegExp(`^${episode}\\\.`)
								if (filename.match(re_) || (episode * 1 < 10 && filename.match(re))) {
									fileIdx = idx
									size = $(this).text().replace(/.*\(/, '').replace(/\)/, '')
									promises.push(format(magnet, title, size, fileIdx, streams, type))
								}
							}
						})
					}
				}
			})
		}
	})
	await Promise.all(promises)
	return streams
}

async function format(magnet, title, size, fileIdx = null, streams, type) {
	var temp = magnet.split('&tr=')
	var infoHash = temp[0].replace(/&dn=.*/g, '').replace(/magnet:\?xt=urn:btih:/g, '')
	size = size.replace(/.*\(/g, '').replace(/\)/g, '')
	// var trackers = []
	// for (i in temp) {
	//     if (i >= 1) {
	//         trackers.push(temp[i].replace(/%3A/g, ':').replace(/%2F/g, '/'))
	//     }
	// }
	var resolution = ''
	var sort_id = 6
	if (title.indexOf('4k') != -1 || title.indexOf('4K') != -1 || title.indexOf('2160p') != -1 || title.indexOf('2160P') != -1 || title.indexOf('3840') != -1 || title.indexOf('2160') != -1 || title.indexOf('UHD') != -1) {
		resolution = '2160p'
		sort_id = 1
	} else if (title.indexOf('1080p') != -1 || title.indexOf('1080P') != -1 || title.indexOf('1920') != -1 || title.indexOf('1080') != -1) {
		resolution = '1080p'
		sort_id = 2
	} else if (title.indexOf('720p') != -1 || title.indexOf('720P') != -1 || title.indexOf('1280') != -1 || title.indexOf('x720') != -1 || title.indexOf('X720') != -1) {
		resolution = '720p'
		sort_id = 3
	} else if (title.indexOf('480p') != -1 || title.indexOf('480P') != -1 || title.indexOf('x480') != -1 || title.indexOf('X480') != -1) {
		resolution = '480p'
		sort_id = 4
	} else if (title.indexOf('360p') != -1 || title.indexOf('360P') != -1 || title.indexOf('x360') != -1 || title.indexOf('X360') != -1) {
		resolution = '360p'
		sort_id = 5
	} else {
		resolution = 'unknown'
		sort_id = 6
	}
	if (title.indexOf('HDR') != -1) {
		resolution += ' HDR'
		sort_id -= 0.5
	}
	var icon = ''
	if (type === 'movie') {
		icon = '📽️'
	} else if (type === 'series') {
		icon = '📺'
	}
	var byte = await sizeToByte(size)
	var stream = {
		infoHash: infoHash,
		fileIdx: fileIdx,
		//trackers: trackers,
		description: icon + title + '\n💿' + size,
		name: resolution,
		sort_id: sort_id,
		size: size,
		byte: byte,
		behaviorHints: {
			bingeGroup: 'pyw-' + resolution.replace(/ /g, '-') + '-' + size
		}
	}
	streams.push(stream)
}

async function sortBy(streams) {
	streams.sort((a, b) => { return a.sort_id - b.sort_id })
	var temp = []
	for (i = 0; i < 12; i++) {
		temp[i] = []
	}
	for (i in streams) {
		if (streams[i].sort_id == 0.5) {
			temp[0].push(streams[i])
		} else if (streams[i].sort_id == 1) {
			temp[1].push(streams[i])
		} else if (streams[i].sort_id == 1.5) {
			temp[2].push(streams[i])
		} else if (streams[i].sort_id == 2) {
			temp[3].push(streams[i])
		}
		else if (streams[i].sort_id == 2.5) {
			temp[4].push(streams[i])
		}
		else if (streams[i].sort_id == 3) {
			temp[5].push(streams[i])
		}
		else if (streams[i].sort_id == 3.5) {
			temp[6].push(streams[i])
		}
		else if (streams[i].sort_id == 4) {
			temp[7].push(streams[i])
		}
		else if (streams[i].sort_id == 4.5) {
			temp[8].push(streams[i])
		}
		else if (streams[i].sort_id == 5) {
			temp[9].push(streams[i])
		} else if (streams[i].sort_id == 5.5) {
			temp[10].push(streams[i])
		} else if (streams[i].sort_id == 6) {
			temp[11].push(streams[i])
		}
	}
	for (i in temp) {
		temp[i].sort((a, b) => { return b.byte - a.byte })
	}
	streams = temp[0].concat(temp[1]).concat(temp[2]).concat(temp[3]).concat(temp[4]).concat(temp[5]).concat(temp[6]).concat(temp[7]).concat(temp[8]).concat(temp[9]).concat(temp[10]).concat(temp[11])
	return streams
}

async function sizeToByte(size) {
	var byte = 0
	var str = size.toString()
	if (str.indexOf('TB') != -1) {
		byte = str.replace('TB', '') * 1024 * 1024 * 1024 * 1024
	} else if (str.indexOf('GB') != -1) {
		byte = str.replace('GB', '') * 1024 * 1024 * 1024
	} else if (str.indexOf('MB') != -1) {
		byte = str.replace('MB', '') * 1024 * 1024
	} else if (str.indexOf('KB') != -1) {
		byte = str.replace('KB', '') * 1024
	}
	return byte
}

module.exports = builder.getInterface()