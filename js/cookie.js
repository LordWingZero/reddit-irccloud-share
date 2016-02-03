function getSessionKey(cb){	
	chrome.cookies.get({url: 'https://www.irccloud.com', name: 'session'}, function(cookie){
		cb(cookie);
	});
}