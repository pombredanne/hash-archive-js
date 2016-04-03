// Copyright 2016 Ben Trask
// MIT licensed (see LICENSE for details)

var hashm = exports;

var multihash = require("multihashes");
var bs58 = require("bs58");

var has = require("./has");

var algo_to_mh = {
	"sha1": "sha1",
	"sha256": "sha2-256",
	"sha512": "sha2-512",
	"sha3": "sha3",
};
var mh_to_algo = map_invert(algo_to_mh);

function map_invert(obj) {
	var x = {};
	Object.keys(obj).forEach(function(key) {
		x[obj[key]] = key;
	});
	return x;
}

function base64_url_enc(buf) {
	return buf.toString("base64").replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}
function base64_url_dec(str) {
	return new Buffer(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

hashm.parse = function(hash) {
	var hu = /^hash:\/\/([\w\d.-]+)\/([\w\d.%_-]+)(\?[\w\d.%_=&-]+)?(#[\w\d.%_-]+)?$/i;
	var pfx = /^([\w\d]+)-([\w\d/+=]+)$/;
	var ni = /^ni:\/\/\/([\w\d.-]+);([\w\d_-]+)$/i;
	var mh = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,}$/;
	var match;
	if((match = hu.exec(hash))) return {
		type: "hash-uri",
		algo: match[1].toLowerCase(),
		data: new Buffer(match[2], "hex"),
	};
	if((match = pfx.exec(hash))) return {
		type: "prefix",
		algo: match[1].toLowerCase(),
		data: new Buffer(match[2], "base64"),
	};
	if((match = ni.exec(hash))) return {
		type: "named-info",
		algo: match[1].toLowerCase(),
		data: base64_url_dec(match[2]),
	};
	if((match = mh.exec(hash))) {
		try {
			var x = new Buffer(bs58.decode(hash));
			var obj = multihash.decode(x);
			return {
				type: "multihash",
				algo: has(mh_to_algo, obj.name) ? mh_to_algo[obj.name] : obj.name,
				data: obj.digest,
			};
		} catch(e) {}
	};
	return null;
}
hashm.format = function(type, algo, data) {
	switch(type) {
		case "hash-uri":
			return "hash://"+algo+"/"+data.toString("hex");
		case "named-info":
			return "ni:///"+algo+";"+base64_url_enc(data);
		case "prefix":
			return algo+"-"+data.toString("base64");
		case "multihash":
			if(!has(algo_to_mh, algo)) return null;
			return bs58.encode(multihash.encode(data, algo_to_mh[algo]));
		default: return null;
	}
}
hashm.normalize = function(hash) {
	var obj = hashm.parse(hash);
	if(!obj) return null;
	return hashm.format(obj.type, obj.algo, obj.data);
}
hashm.variants = function(algo, data) {
	var types = [
		"hash-uri",
		"hash-uri-b64",
		"named-info",
		"prefix",
		"multihash",
	];
	var obj = {};
	for(var i = 0; i < types.length; i++) {
		obj[types[i]] = hashm.format(types[i], algo, data);
	}
	return obj;
}

