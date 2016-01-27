document.addEventListener('DOMContentLoaded', function() {
	var recentlySent = $('#recentlySent');
	chrome.storage.local.get('history', function(items){
		items.history.forEach(function(historyItem){
			var newElement = $([
				'<li>',
				'<div>',
				'<label title="' + historyItem.date + '">Sent to ' + historyItem.to + '</label>',
				'</div>',
				'<hr />',
				'<strong>' + historyItem.msg + '<strong>',
				'</li>'
				].join(''));
			recentlySent.append(newElement);
		});
	});
});