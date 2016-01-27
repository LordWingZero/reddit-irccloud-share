// Handle share button click
function handleShareClick() {
    var self = this;

    var titleDiv = $(self).closest('.title').find('a.title');
    var title = titleDiv.text();
    var URL = titleDiv.attr('href');

    if(_.startsWith(URL, '/r/')){
        URL = ('https://www.reddit.com' + URL);
    }

    var message = title + ' - ' + URL;

    chrome.storage.local.get('dialogOpts', function(options) {
        chrome.storage.local.get('history', function(history) {

            if (options.dialogOpts) {
                message = options.dialogOpts.format.replace('%title%', title).replace('%url%', URL);
            }

            var existingShareDialogs = $(self).closest('.entry').children('.reddit-irccloud-share');
            if (existingShareDialogs.length !== 0) {
                removeAndDestroy(existingShareDialogs);
                return;
            }

            chrome.runtime.sendMessage({
                type: 'get_cloudlist'
            }, function(response) {

                var shareDialog = buildShareDialog(history, response, message);

                // Events
                shareDialog
                    .find('#sendBtn')
                    .on('click', {
                        shareDialog: shareDialog,
                        shareBtn: self
                    }, sendMessage);

                shareDialog
                    .find('#shareDialogForm')
                    .on('submit', {
                        shareDialog: shareDialog,
                        shareBtn: self
                    }, sendMessage);

                shareDialog
                    .find('a#closeBtn')
                    .on('click', {
                        element: shareDialog
                    }, removeAndDestroyEvent);

                $(self).closest('.buttons').after(shareDialog);
            });
        });
    });
}

function sendMessage(event) {

    event.preventDefault();

    var shareDialog = event.data.shareDialog;
    var selectBox = shareDialog.find('#connectionSelBox option:selected');
    var cid = selectBox.closest('optgroup').attr('value');
    var name = selectBox.text();

    chrome.runtime.sendMessage({
        type: 'send',
        name: name,
        message: shareDialog.find('#ircmsgTxt').val(),
        cid: cid
    }, function(response) {
        $(event.data.shareBtn).text('share-irccloud (sent to ' + name + '!)').css({
            color: 'green'
        });
        removeAndDestroy(shareDialog);
    });
}

function removeAndDestroyEvent(event) {
    removeAndDestroy(event.data.element);
}

function removeAndDestroy(element) {    
    element.remove();
}

function buildShareDialog(sentHistory, bufferHistory, message) {

    var select = $('<select id="connectionSelBox" class="c-form-control"></select>');
    for (cid in bufferHistory.list) {
        var li = $('<optgroup value="' + cid + '" label="' + bufferHistory.list[cid].name + '"></optgroup>');
        bufferHistory.list[cid].buffers.forEach(function(buffer) {
            li.append('<option value="' + buffer.bid + '">' + buffer.name + '</option>');
        });
        select.append(li);
    };

    if (sentHistory.history) {
        select.find('option').each(function() {
            this.selected = (this.text == sentHistory.history[0].to);
        });
    }

    var selectWrapper = $([
        '<div class="c-form-group">',
        '<div class="post-sharing-label">Channel:</div>',
        '</div>'
    ].join(''));

    selectWrapper.append(select);

    var shareDialog = $([            
            '<div class="reddit-irccloud-share post-sharing" style="display: none;">',
            '<a id="closeBtn" class="c-close c-hide-text">close this window</a>',
            '<div class="post-sharing-main post-sharing-form" style="display:block;">',
            '<div class="c-form-group">',
            '<div class="post-sharing-label">Text:</div>',
            '<form id="shareDialogForm">',
            '<input id="ircmsgTxt" class="post-sharing-link-input c-form-control" type="text"/>',
            '</form>',
            '</div>',
            '<div class="c-form-group">',
            '<button id="sendBtn" type="button" class="btn btn-primary">Send</button>',
            '</div>',
            '</div>',
            '</div>'
        ].join(''));

    shareDialog.find('#ircmsgTxt').val(message);

    shareDialog
        .prepend(selectWrapper)        
        .show()        

    return shareDialog;
}

// Create share button
const redditIRCCLoudShareBtn = $('<li class="irccloud"><a>share-irccloud</a></li>');

// Attache event handler
redditIRCCLoudShareBtn.on('click', handleShareClick);

// Append to DOM
var buttonMenu = $('.buttons').append(redditIRCCLoudShareBtn);