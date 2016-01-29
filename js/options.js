function loadRules() {
    chrome.storage.local.get('dialogOpts', function(options) {
        if (options.dialogOpts) {
            document.getElementById('formatTxt').value = options.dialogOpts.format;
        } else {
            document.getElementById('formatTxt').value = '"%title%" %url%';
        }
    });
}

function save() {
    var format = document.getElementById('formatTxt').value;

    if (!format) {
        alert('Format cannot be empty!');
    }

    chrome.storage.local.set({
        'dialogOpts': {
            "format": format
        }
    }, function() {
        document.getElementById('notifyLbl').innerHTML = 'Saved! - ' + new Date();
    });
}

function clear() {
    var confirm = window.confirm('CAUTION\nAre you sure you want to purge out all data for this extenion?');
    if (confirm) {
         chrome.storage.local.clear(function() {
			chrome.runtime.sendMessage({type: "reconnect"}, function(response) {
				document.getElementById('notifyLbl').innerHTML = 'All data cleared! - ' + new Date();
			});	        
	    });   
    }
}

window.onload = function() {
    loadRules();
    document.getElementById('saveBtn').onclick = function() {
        save();
    };
    document.getElementById('clearBtn').onclick = function() {
        clear();
    };    
}