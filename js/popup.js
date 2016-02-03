document.addEventListener('DOMContentLoaded', function() {
	var recentlySent = $('#recentlySent');
	chrome.storage.local.get('history', function(items){
		items.history.forEach(function(historyItem){
			var newElement = $([
				'<li>',
				'<strong>' + historyItem.msg + '<strong>',
				'<div>',				
				'<label title="' + historyItem.date + '">Sent to ' + historyItem.to + '</label>',
				'</div>',				
				'</li>'
				].join(''));
			recentlySent.append(newElement);
		});
	});

	$('#optionsLink').on('click', function(){
		chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
	});

});

window.onload = function() {
    chrome.runtime.sendMessage({
      type: "error_check"
    },
    function(response) {
    	console.log(response);
      $('#error').text(response);
    });
}