var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var pastehyperlink = {
    prefs: Services.prefs,
    prompts: Services.prompt,

    onLoad: function() {
        // initialization code
        this.initialized = true;
        window.removeEventListener('load', pastehyperlink.onLoad, false);
        var firstrun = this.prefs.getBoolPref("extensions.pastehyperlink.firstrun");

        //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Using_nsIXULAppInfo
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
        if (appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}") { // running under Thunderbird
            this.AddThunderbirdFormatButton("pastehyperlink-formatbutton_pastehyperlink");
            this.AddThunderbirdFormatButton("pastehyperlink-formatbutton_removehyperlink");
            this.AddThunderbirdFormatButton("pastehyperlink-formatbutton_fetchhyperlink");
        } else if (appInfo.ID == "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}") { // running under SeaMonkey
            this.AddSeaMonkeyFormatButton("pastehyperlink-formatbutton_pastehyperlink");
            this.AddSeaMonkeyFormatButton("pastehyperlink-formatbutton_removehyperlink");
            this.AddSeaMonkeyFormatButton("pastehyperlink-formatbutton_fetchhyperlink");

            if (firstrun) { // Insert the toolbar button.
                this.AddSeaMonkeyToolbarButton("pastehyperlink-toolbarbutton_removehyperlink");
                this.AddSeaMonkeyToolbarButton("pastehyperlink-toolbarbutton_pastehyperlink");
                this.AddSeaMonkeyToolbarButton("pastehyperlink-toolbarbutton_fetchhyperlink");

                this.prefs.setBoolPref("extensions.pastehyperlink.firstrun", false);
            };
        }
        this.DisplayFormatToolbarButtons();
        this.prefs.addObserver("", this, false);
    },


    observe: function(subject, topic, data) {
        if (data = "displayformatbuttons") {
            console.log("observed");
            this.DisplayFormatToolbarButtons();
        }
    },

    //AddToolbarButton: function(whatbutton){
    // if(navigator.userAgent.search(/SeaMonkey/gi) >= 0) {
    // this.AddSeaMonkeyToolbarButton(whatbutton);

    // }
    // if(navigator.userAgent.search(/Thunderbird/gi) >= 0) {
    // this.AddThunderbirdToolbarButton(whatbutton);
    // this.prefs.setBoolPref('extensions.pastehyperlink.firstrun', false);
    // }
    //},

    AddThunderbirdToolbarButton: function(whatbutton) {
        var toolbar = document.getElementById('composeToolbar2'); //Main Compose Window Toolbar
        if (!toolbar.currentSet.match(whatbutton)) {
            var addthis = "," + whatbutton;
            var newset = toolbar.currentSet.concat(addthis);
            toolbar.currentSet = newset;
            toolbar.setAttribute('currentset', newset);
            document.persist(toolbar.id, "currentset");
            document.getElementById('compose-toolbox').customizeDone(true);
        };

    },

    AddThunderbirdFormatButton: function(whatbutton) {
        var toolbar = document.getElementById('FormatToolbar'); //Compose Window Format Toolbar
        if (!toolbar.currentSet.match(whatbutton)) {
            var addthis = "," + whatbutton;
            var newset = toolbar.currentSet.concat(addthis);
            toolbar.currentSet = newset;
            toolbar.setAttribute('currentset', newset);
            document.persist(toolbar.id, "currentset");
        };

    },


    AddSeaMonkeyToolbarButton: function(whatbutton) {
        var toolBar = document.getElementById('composeToolbar');
        if (toolBar != null) {
            var afterId = "button-save";
            var curSet = toolBar.currentSet.split(",");
            if (curSet.indexOf(whatbutton) == -1) {
                var pos = curSet.indexOf(afterId) + 1 || curSet.length;
                var set = curSet.slice(0, pos).concat(whatbutton).concat(curSet.slice(pos));
                toolBar.setAttribute("currentset", set.join(","));
                toolBar.currentSet = set.join(",");
                document.persist(toolBar.id, "currentset");
            }
        }
    },

    AddSeaMonkeyFormatButton: function(whatbutton) {
        var toolbar = document.getElementById('FormatToolbar'); //Compose Window Format Toolbar
        if (!toolbar.currentSet.match(whatbutton)) {
            var addthis = "," + whatbutton;
            var newset = toolbar.currentSet.concat(addthis);
            toolbar.currentSet = newset;
            toolbar.setAttribute('currentset', newset);
            document.persist(toolbar.id, "currentset");
        };
    },

    //check the preference and either add or remove the format buttons
    DisplayFormatToolbarButtons: function() {
        var displayformatbuttons = this.prefs.getBoolPref("extensions.pastehyperlink.displayformatbuttons");
        var pastehyperlinkformatbutton = document.getElementById("pastehyperlink-formatbutton_pastehyperlink");
        var removehyperlinkformatbutton = document.getElementById("pastehyperlink-formatbutton_removehyperlink");
        var fetchhyperlinkformatbutton = document.getElementById("pastehyperlink-formatbutton_fetchhyperlink");
        //set the visibility of the button to the boolean value of the pref - use the switch because we have to reverse the effect
        switch (displayformatbuttons) {
            case true:
                pastehyperlinkformatbutton.setAttribute("hidden", false);
                removehyperlinkformatbutton.setAttribute("hidden", false);
                fetchhyperlinkformatbutton.setAttribute("hidden", false);
                break;
            case false:
                pastehyperlinkformatbutton.setAttribute("hidden", true);
                removehyperlinkformatbutton.setAttribute("hidden", true);
                fetchhyperlinkformatbutton.setAttribute("hidden", true);
                break;
        }

    },

    OpenPrefsPanel: function() {
        var prefpanel = window.openDialog("chrome://pastehyperlink/content/options.xul", "", "centerscreen,chrome,modal");
    },


    //Lead function used by the buttons
    DoTheHyperlinkThing: function(whatparam) {
        //see if there is text on the clipboard, and fetch it		
        var cliptext = this.GetTheClipboard();
        cliptext.replace(/\r*|\n*|\t*/g, ""); //remove carriage returns and tabs because they will break the hyperlink		
        cliptext.trim();
        this.PrepareHyperlink(cliptext);
    },

    //Take the contents of the clipboard and use it as the hyperlink, and use the selection as the linktext
    PrepareHyperlink: function(whatcliptext) {
        var thislink = whatcliptext;

        //BUILD THE HYPERLINK
        //first, check to see if it is an email so we don't do anything dastardly to it
        if (this.prefs.getBoolPref("extensions.pastehyperlink.linkifyemail")) {
            if (this.IsValidEmail(thislink)) {
                thislink = "mailto:" + thislink
                this.PasteHyperlink(thislink, whatcliptext); //we don't need to process further, so pastehyperlink now
                return null;
            };
        };

        //USER CONFIRMATION
        //if the clipboard doesn't contain a valid url, then ask the user whether to paste it anyway.
        if (this.prefs.getBoolPref("extensions.pastehyperlink.confirmvalidation")) { //if the option is set to true...
            if (!this.IsValidUrl(thislink)) {
                var proceed = this.prompts.confirm(null, "PasteHyperlink", document.getElementById("pastehyperlinkStrings").getString("pastehyperlinkConfirm"));
                if (!proceed) { return null; }; //if they say no, then don't do it
            };
        };

        //did the user want us to urlencode the links?		
        if (this.prefs.getBoolPref("extensions.pastehyperlink.encodecliptext")) { //if the option is set to true...
            //if we have a valid link, then encode it.
            if (this.IsValidUrl(thislink)) { //gotten from the validation above
                //var protocolregex = /^((file|ftp|http|https):\/\/+|(mailto|callto|dial):)(.*)/gi;
                //var urlsections = protocolregex.exec(thislink);	
                //thislink = urlsections[1] + encodeURI(urlsections[4]);
                //thislink = encodeURI(thislink);
                //}else{  //it's not valid anyway, so just encode it all
                thislink = encodeURI(thislink);
            };
        };

        //APPEND HTTP IF NECESSARY
        if (this.prefs.getBoolPref("extensions.pastehyperlink.prependhttp")) { //if the option is set to true...		
            var matchwww = /^www.*/;
            var wwwmatch = matchwww.exec(thislink);
            if (wwwmatch || !this.IsValidUrl(thislink)) {
                thislink = "http://" + thislink;
            };
        };

        this.PasteHyperlink(thislink, whatcliptext);
        return null;
    },

    //Inserts a hyperlink element into the text and applies the proper escaping procedure
    //http://msdn.microsoft.com/en-us/library/ie/xh9be5xc(v=vs.94).aspx
    PasteHyperlink: function(whatlink, whatcliptext) {
        console.log('Paste', thislink);
        console.log('gMsgCompose', gMsgCompose);
        var thiseditor = gMsgCompose.editor.QueryInterface(Components.interfaces.nsIHTMLEditor);
        console.log('thiseditor', thiseditor);
        if (!thiseditor) { return null; };
        let link = thiseditor.document.createElement("a");
        link.setAttribute("href", whatlink);

        var selectedtext = this.IsSelection();
        if (!selectedtext) {
            //since there is no selection, use the clipboard text as the link text
            link.textContent = whatcliptext;
            thiseditor.insertElementAtSelection(link, false);
        } else {
            //if there is a selection, insert the hyperlink into the selection
            link.textContent = selectedtext;
            thiseditor.insertElementAtSelection(link, true);
        };
        return null;
    },


    RemoveTheHyperlink: function(whatevent) {
        var thiseditor = gMsgCompose.editor.QueryInterface(Components.interfaces.nsIHTMLEditor);
        if (!thiseditor) { return null; };

        var selectedtext = this.IsSelection();
        if (!selectedtext) {
            let thiselement = thiseditor.getElementOrParentByTagName("href", null); //fetch the href value
            if (thiselement) {
                thiseditor.selectElement(thiselement)
                EditorRemoveTextProperty("href", "");
            }
        } else {
            EditorRemoveTextProperty("href", "");
        }
        return null;
    },

    FetchTheHyperlink: function() {
        var thiseditor = gMsgCompose.editor.QueryInterface(Components.interfaces.nsIHTMLEditor);
        if (!thiseditor) { return null; };

        let thiselement = thiseditor.getElementOrParentByTagName("href", null); //fetch the href value
        if (thiselement) {
            //copy the value to the clipboard
            this.PutTheClipboard(thiselement);
        }

        return null;
    },

    //return the selected text if there is any
    IsSelection: function() {
        var thisselection = document.commandDispatcher.focusedWindow.getSelection();
        var thistext = thisselection.toString();
        if (thistext) { return thistext; }
        return false;
    },

    IsValidUrl: function(whaturl) {
        var hval = /^(((ftp|http|https|file|www|mailto|callto|dial):(\/\/|\/\/+|(?!\/)))(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/;
        var isvalid = hval.exec(whaturl);
        if (isvalid) { return true; };
        return false;
    },

    IsValidEmail: function(whaturl) {
        var emailregex = /^(([a-zA-Z0-9\._-]+)@([a-zA-Z0-9-]+)\.([a-zA-Z]{2,5}))$/gi;
        var isemail = emailregex.exec(whaturl);
        if (isemail) { return true; }
        return false;
    },





    GetTheClipboard: function() {
        try {
            //see:  https://developer.mozilla.org/en-US/docs/Using_the_Clipboard
            var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
            if (!clip) return "";

            var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
            if ('init' in trans) {
                try {
                    trans.init(
                        (window.content || window).QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation)
                    );
                } catch (e) {}
            }
            //if ('init' in trans){ trans.init(null);};	//https://bugzilla.mozilla.org/show_bug.cgi?id=800495#c1 - call with 'null' because our content could come from outside the application
            if (!trans) { return false; }
            trans.addDataFlavor("text/unicode");
            var gottentext = "";
            try {
                clip.getData(trans, clip.kGlobalClipboard);
                var str = new Object();
                var strLength = new Object();
                trans.getTransferData("text/unicode", str, strLength);

                if (str) {
                    str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
                    //We need to convert the data back into a JavaScript string from a XPCOM objec
                    gottentext = str.data.substring(0, strLength.value / 2);
                }
            } catch (e) {} //if there isn't anything on the clipboard, don't throw any error
            return gottentext;
        } catch (err) {
            this.prompts.alert(null, "PasteHyperlink", document.getElementById("pastehyperlinkStrings").getString("pastehyperlinkError") + "\n" + err);
            return null;
        }
    },

    PutTheClipboard: function(putwhat) {
        var clipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1'].
        getService(Components.interfaces.nsIClipboardHelper);
        clipboardHelper.copyString(putwhat);
    },

    //----------------------------------------------------------------------------------------------------

    onMenuItem_pastehyperlink: function(e) { this.DoTheHyperlinkThing(e); },
    onMenuItem_removehyperlink: function(e) { this.RemoveTheHyperlink(e); },
    onMenuItem_fetchhyperlink: function(e) { this.FetchTheHyperlink(e); },

    onContextMenu_pastehyperlink: function(e) { this.DoTheHyperlinkThing(e); },
    onContextMenu_removehyperlink: function(e) { this.RemoveTheHyperlink(e); },
    onContextMenu_fetchhyperlink: function(e) { this.FetchTheHyperlink(e); },

    onToolbarButton_pastehyperlink: function(e) { this.DoTheHyperlinkThing(e); },
    onToolbarButton_removehyperlink: function(e) { this.RemoveTheHyperlink(e); },
    onToolbarButton_fetchhyperlink: function(e) { this.FetchTheHyperlink(e); },

    onFormatButton_pastehyperlink: function(e) { this.DoTheHyperlinkThing(e); },
    onFormatButton_removehyperlink: function(e) { this.RemoveTheHyperlink(e); },
    onFormatButton_fetchhyperlink: function(e) { this.FetchTheHyperlink(e); },

    onKeyboard_pastehyperlink: function(e) { this.DoTheHyperlinkThing(e); },
    onKeyboard_removehyperlink: function(e) { this.RemoveTheHyperlink(e); },
    onKeyboard_fetchhyperlink: function(e) { this.FetchTheHyperlink(e); }

}; //end var pastehyperlink


window.addEventListener("load", function(e) { pastehyperlink.onLoad(e); }, false);