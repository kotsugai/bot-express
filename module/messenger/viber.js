'use strict';

let Promise = require('bluebird');
let request = require('request');
let crypto = require('crypto');
let debug = require('debug')('bot-express:messenger');
const memory = require('memory-cache');

const API_URL = 'https://chatapi.viber.com/pa';

Promise.promisifyAll(request);

module.exports = class MessengerViber {

    constructor(options){
        this._auth_token = options.viber_auth_token;
    }

    multicast(event, to, messages){
        // If this is test, we will not actually issue call out.
        if (process.env.BOT_EXPRESS_ENV == 'test'){
            debug('This is test so we skip the actual call out.');
            return Promise.resolve();
        }

      // return this.sdk.multicast(to, messages);
    }

    send(event, to, messages){
        // If this is test, we will not actually issue call out.
        if (process.env.BOT_EXPRESS_ENV == 'test'){
            debug('This is test so we skip the actual call out.');
            return Promise.resolve();
        }

        let url = `${API_URL}/send_message`;

        let promises = [];
        promises.push(this._make_get_account_info_promise());
        for(let message of messages){
            
            let body = {
                auth_token: this._auth_token,
                receiver: to,
            }
            body = Object.assign(body, message);
            promises.push(this._make_send_promises(url, body));
        }

        // execute sequensial 
        return promises.reduce((prev, curr, index, array) => {
            return prev.then(curr);
        }, Promise.resolve());
    }

    _make_send_promises(url, body){
        return () => {
            body.sender = {name:this._name,avatar:this._icon};
            return request.postAsync({
                url: url,
                headers:{'Content-Type':'application/json; charset=utf-8'},
                body: body,
                json: true
            }).then(
                (response) => {
                    if (response.statusCode === 200){
                        if(response.body.status !== 0){
                            debug(`viber.send() success but receive status=${response.body.status}`);
                            debug(`viber.send() receive message=${response.body.status_message}`);
                            return Promise.reject(new Error(response.body.status_message));
                        }
                    }
                    if (response.statusCode !== 200){
                        debug('viber.send() failed.');
                        if (response.body && response.body.error && response.body.error.message){
                            return Promise.reject(new Error(response.body.error.message));
                        } else if (response.statusMessage){
                            return Promise.reject(new Error(response.statusMessage));
                        }
                    }
                    return Promise.resolve(response);
                }
            );
        }
    }

    _make_get_account_info_promise(){
        return () => {
            let bot_info = memory.get('viber');

            if(bot_info !== null){
                this._name = bot_info.name;
                this._icon = bot_info.icon_url;
                return Promise.resolve();
            } else {
                debug('get viber bot information');
                let url = `${API_URL}/get_account_info`;
                return request.postAsync({
                    url: url,
                    body: {auth_token: this._auth_token},
                    json: true
                }).then(
                    (response) => {
                        if (response.statusCode === 200){
                            if(response.body.status !== 0){
                                debug(`viber.get_account_info() success but receive status= ${response.body.status}`);
                                debug(`viber.get_account_info() receive message=${response.body.status_message}`);
                                return Promise.reject(new Error(response.body.status_message));
                            }
                        }
                        if (response.statusCode !== 200){
                            debug('viber.get_account_info() failed.');
                            if (response.body && response.body.error && response.body.error.message){
                                return Promise.reject(new Error(response.body.error.message));
                            } else if (response.statusMessage){
                                return Promise.reject(new Error(response.statusMessage));
                            }
                        }
                        
                        memory.put('viber',{
                            name: response.body.name,
                            icon_url: response.body.icon
                        });
                        this._name = response.body.name;
                        this._icon = response.body.icon;
                            
                        return Promise.resolve();
                    }
                );
            }
        }
    }

    reply(event, messages){
        return this.send(event, event.sender.id, messages);
    }

    validate_signature(req){
        // If this is test, we will not actually validate the signature.
        if (process.env.BOT_EXPRESS_ENV === 'test'){
            debug('This is test so we skip validating signature.');
            return true;
        }

        let signature = req.get('x-viber-content-signature') || req.query.sig;
        let raw_body = req.raw_body;
        let hash = crypto.createHmac('sha256', this._auth_token).update(raw_body).digest('hex');
        if (hash != signature) {
            return false;
        }
        // debug
        debug('[validate_signature]','raw_body:',raw_body.toString());
        return true;
    }

    static extract_events(body){
        let events = [body];

        return events;
    }
    
    static identify_event_type(event){
        let event_type;
        if(event.event){
            if(event.event === 'message'){
                event_type = 'message';
            } else if(event.event === 'delivered'){
            } else if(event.event === 'subscribed'){
            } else if(event.event === 'unsubscribed'){
            } else if(event.event === 'conversation_started'){
            } else if(event.event === 'delivered'){
            } else if(event.event === 'seen'){
            } else if(event.event === 'failed'){
            }
        }
        return event_type;
    }

    static extract_beacon_event_type(event){
        let beacon_event_type = false;
        return beacon_event_type;
    }

    static extract_sender_id(event){
        let sender_id;
        if(event.sender){
            sender_id = event.sender.id;
        } else if(event.user_id){
            sender_id = event.user_id;
        }
        return sender_id;
    }

    static check_supported_event_type(flow, event){
        switch(flow){
            case 'beacon':
                return false;
            break;
            case 'start_conversation':
                if (event.event === 'message'){
                    return true;
                }
                return false;
            break;
            case 'reply':
                if (event.event === 'message'){
                    return true;
                }
                return false;
            break;
            case 'btw':
                if (event.event === 'message'){
                    return true;
                }
                return false;
            break;
            default:
                return false;
            break;
        }
    }

    static extract_message(event){
        let message;
        switch(event.event){
            case 'message':
                message = event.message;
            break;
        }
        return message;
    }

    static identify_message_type(message){
        let message_type;
        if (['text', 'picture', 'video', 'file', 'sticker', 'contact', 'url', 'location'].indexOf(message.type) !== -1){
            message_type = message.type;
        } else {
            // This is not LINE format.
            throw new Error('This is not correct viber format.');
        }
        return message_type;
    }
    
    static extract_param_value(event){
        let param_value = event.message.text;
        return param_value;
    }

    static extract_message_text(event){
        let message_text;

        if(event.event === 'message' && event.message.type === 'text'){
            message_text = event.message.text;
        }
        return message_text;
    }

    static compile_message(message_format, message_type, message){
        return MessengerViber[`_compile_message_from_${message_format}_format`](message_type, message);
    }

    static _compile_message_from_line_format(message_type, message){
        let compiled_message;

        switch(message_type){
            case 'text': // -> to text
                compiled_message = {type:'text', text: message.text};
                break;
            case 'image': // -> to image *NEED TEST
                compiled_message = {
                    type:'picture',text:'',
                    media: message.originalContentUrl,
                    thumbnail: message.previewImageUrl
                }
                break;
            case 'video': // -> to video *NEED TEST
                compiled_message = {
                    type:'video',
                    media: message.originalContentUrl,
                    thumbnail: message.previewImageUrl,
                    size: 10000000, // 10MB
                    duration: 60000 // 60seconds
                }
                break;
            case 'audio': // -> to file *NEED TEST
                compiled_message = {
                    type:'file',
                    media: message.originalContentUrl,
                    size: 10000000,     // 10MB
                    file_name: 'sound.m4a'
                }
                break;
            case 'location': // to location *NEED TEST
                compiled_message = {
                    type:'location',
                    location:{lat: message.latitude, lon:message.longitude}
                }
                break;
            case 'sticker': // -> to sticker *NEED TEST
                compiled_message = {type: 'sticker', sticker_id: message.stickerId}
                break;
            case 'buttons_template': // -> to keyboard
            case 'confirm_template': // -> to keyboard *NEED TEST
                compiled_message = {
                    type: 'text',
                    text: `${message.template.text}`,
                    min_api_version: 2,
                    keyboard: {
                        DefaultHeight: false,
                        Buttons:[]
                    }
                }
                let def_col = [6, 3, 2, 3];
                let def_row = [1, 1, 1, 1];
                let columns = def_col[message.template.actions.length - 1];
                let rows = def_row[message.template.actions.length - 1];
                for(let action of message.template.actions){
                    if(action.type === 'postback'){
                        compiled_message.keyboard.Buttons.push({
                            Columns: columns, Rows: rows,
                            Silent: action.text === undefined ? true : false,
                            ActionType: 'reply',
                            ActionBody: action.text === undefined ? action.data : action.text,
                            TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                            BgColor: '#ffffff',
                            Text: `<font color=#003399><b>${action.label}</b></font>`,
                        });
                    }
                    if(action.type === 'message'){
                        compiled_message.keyboard.Buttons.push({
                            Columns: columns, Rows: rows,
                            Silent: false,
                            ActionType: 'reply',
                            ActionBody: action.text,
                            TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                            BgColor: '#ffffff',
                            Text: `<font color=#003399><b>${action.label}</b></font>`,
                        });
                    }
                    if(action.type === 'uri'){
                        compiled_message.keyboard.Buttons.push({
                            Columns: columns, Rows: rows,
                            Silent: false,
                            ActionType: 'open-url',
                            ActionBody: action.uri,
                            TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                            BgColor: '#ffffff',
                            Text: `<font color=#003399><b>${action.label}</b></font>`,
                        });
                    }
                }
                break;
            case 'carousel_template': // -> to rich_media carousel
                let buttons_group_rows = 2;
                let action_count = message.template.columns[0].actions.length;
                if(buttons_group_rows + action_count > 7){
                    let not_support_text = 'not support over 7 rows.';
                    debug(not_support_text);
                    compiled_message = {type:'text',text: not_support_text};
                    break;
                }
                compiled_message = {
                    type: 'rich_media',
                    min_api_version: 2,
                    rich_media: {
                        Type: 'rich_media',
                        ButtonsGroupColumns: 6,
                        ButtonsGroupRows: buttons_group_rows + action_count,
                        BgColor:'#FFFFFF',
                        Buttons: [],
                        alt_text: message.altText
                    }
                }
                for(let column of message.template.columns){
                    if(column.thumbnailImageUrl){
                        compiled_message.rich_media.Buttons.push({
                            Columns: 6,
                            Rows: 1,
                            Silent: true,
                            ActionType: 'none',
                            Image:column.thumbnailImageUrl
                        });
                    }
                    if(column.title){
                        compiled_message.rich_media.Buttons.push({
                            Columns: 6,
                            Rows: 1,
                            Silent: true,
                            ActionType: 'none',
                            TextSize: 'large',
                            TextVAlign: 'middle',
                            TextHAlign: 'left',
                            Text: `<b>${column.title}</b>`,
                        });
                    }
                    compiled_message.rich_media.Buttons.push({
                        Columns: 6,
                        Rows: 1,
                        Silent: true,
                        ActionType: 'none',
                        TextSize: 'large',
                        TextVAlign: 'middle',
                        TextHAlign: 'left',
                        Text: column.text,
                    });
                    for(let action of column.actions){
                        if(action.type === 'postback'){
                            compiled_message.rich_media.Buttons.push({
                                Columns: 6, Rows: 1,
                                Silent: action.text === undefined ? true : false,
                                ActionType: 'reply',
                                ActionBody: action.text === undefined ? action.data : action.text,
                                TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                                Text: `<font color=#003399><b>${action.label}</b></font>`,
                            });
                        }
                        if(action.type === 'message'){
                            compiled_message.rich_media.Buttons.push({
                                Columns: 6, Rows: 1,
                                Silent: false,
                                ActionType: 'reply',
                                ActionBody: action.text,
                                TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                                Text: `<font color=#003399><b>${action.label}</b></font>`,
                            });
                        }
                        if(action.type === 'uri'){
                            compiled_message.rich_media.Buttons.push({
                                Columns: 6, Rows: 1,
                                Silent: false,
                                ActionType: 'open-url',
                                ActionBody: action.uri,
                                TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                                Text: `<font color=#003399><b>${action.label}</b></font>`,
                            });
                        }
                    }
                }
                break;
            case 'imagemap': // -> to unsupported text
            default:
                debug(`Message type is Line's ${message_type} and it is not supported in Viber.`);
                compiled_message = {
                    type: 'text',
                    text: `*Message type is Line's ${message_type} and it is not supported in Viber.`
                }
                break;
        }
        return compiled_message;
    }

    static _compile_message_from_facebook_format(message_type, message){

        let compiled_message;

        switch(message_type){
            case 'text':
                if (!message.quick_replies){
                    compiled_message = {
                        type: 'text',
                        text: message.text
                    }
                } else {
                    compiled_message = {
                        type: 'text',
                        text: `${message.text}`,
                        min_api_version: 3,
                        keyboard: {
                            DefaultHeight: false,
                            Buttons:[]
                        }
                    }
                    let keyboard_translate_table = [
                        {loop:1,fillers:[],style:[{col:6,row:1}]},
                        {loop:2,fillers:[],style:[{col:3,row:1},{col:3,row:1}]},
                        {loop:3,fillers:[],style:[{col:2,row:1},{col:2,row:1},{col:2,row:1}]},
                        {loop:4,fillers:[],style:[{col:3,row:1},{col:3,row:1},{col:3,row:1},{col:3,row:1}]},
                        {loop:6,fillers:[5],style:[{col:2,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1}]},
                        {loop:6,fillers:[],style:[{col:2,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1}]},
                        {loop:7,fillers:[],style:[{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:6,row:1}]},
                        {loop:8,fillers:[],style:[{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:3,row:1},{col:3,row:1}]},
                        {loop:9,fillers:[],style:[{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:2,row:1},{col:2,row:1},{col:2,row:1}]},
                        {loop:12,fillers:[10,11],style:[{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1}]},
                        {loop:12,fillers:[11],style:[{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1},{col:1,row:1}]},
                        {loop:12,fillers:[],style:[{col:6,row:1}]},
                    ];

                    let trans_def = keyboard_translate_table[message.quick_replies.length - 1];
                    for(let i = 0;i < trans_def.loop;i++){
                        let quick_reply = message.quick_replies[i];
                        let button = {
                            Columns: trans_def.style[i].col, Rows: trans_def.style[i].row,
                        };
                        if(trans_def[i].fillers.indexOf(i) === -1){
                            if(quick_reply.content_type === 'text'){
                                button.ActionType = 'reply';
                                button.Silent = false;
                                button.ActionBody = quick_reply.payload;
                                button.TextSize = 'large';
                                button.TextVAlign = 'middle';
                                button.TextHAlign = 'center';
                                button.BgColor = '#ffffff';
                                button.Text = `<font color=#003399><b>${quick_reply.title}</b></font>`;
                            }
                            if(quick_reply.content_type === 'location'){
                                button.ActionType = 'location-picker';
                            }
                        } else {
                            button.ActionType = 'none';
                            button.Text = ' ';
                        }
                        compiled_message.keyboard.Buttons.push(button);
                    }
                }
                break;
            case 'audio': // -> to file *NEED TEST
                let file_name = message.attachment.payload.url.match(".+/(.+?)([\?#;].*)?$")[1];
                compiled_message = {
                    type:'file',
                    media: message.attachment.payload.url,
                    size: 10000000,     // 10MB
                    file_name: file_name
                }
                break;
            case 'image': // -> to image *NEED TEST
                compiled_message = {
                    type:'picture',text:'',
                    media: message.attachment.payload.url,
                    thumbnail: message.attachment.payload.url
                }
                break;
            case 'video': // -> to video *NEED TEST
                compiled_message = {
                    type:'video',
                    media: message.attachment.payload.url,
                    thumbnail: message.attachment.payload.url,
                    size: 10000000, // 10MB
                    duration: 60000 // 60seconds
                }
                break;
            case 'file': // -> to file *NEED TEST
                let url_file_name = message.attachment.payload.url.match(".+/(.+?)([\?#;].*)?$")[1];
                compiled_message = {
                    type:'file',
                    media: message.attachment.payload.url,
                    size: 10000000,     // 10MB
                    file_name: url_file_name
                }
                break;
            case 'button_template': // to keyboard *NEED TEST
                compiled_message = {
                    type: 'text',
                    text: message.attachment.payload.text,
                    min_api_version: 2,
                    keyboard: {
                        DefaultHeight: false,
                        Buttons:[]
                    }
                }
                let def_col = [6, 3, 2, 3];
                let def_row = [1, 1, 1, 1];
                let columns = def_col[message.attachment.payload.buttons.length - 1];
                let rows = def_row[message.attachment.payload.buttons.length - 1];
                for(let button of message.attachment.payload.buttons){
                    if(button.type === 'postback'){
                        compiled_message.keyboard.Buttons.push({
                            Columns: columns, Rows: rows,
                            Silent: true,
                            ActionType: 'reply',
                            ActionBody: button.payload,
                            TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                            BgColor: '#ffffff',
                            Text: `<font color=#003399><b>${button.title}</b></font>`,
                        });
                    } else if(button.type === 'web_url'){
                        compiled_message.keyboard.Buttons.push({
                            Columns: columns, Rows: rows,
                            Silent: false,
                            ActionType: 'open-url',
                            ActionBody: button.url,
                            TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                            BgColor: '#ffffff',
                            Text: `<font color=#003399><b>${button.title}</b></font>`,
                        });
                    } else {
                        debug(`Compiling template messege including ${button.type} button from facebook format to viber format is not supported since viber does not have corresponding template.`);
                        compiled_message = {
                            type: "text",
                            text: `*Compiling template messege including ${button.type} button from facebook format to viber format is not supported since viber does not have corresponding template.`
                        }
                        break;
                    }
                }
                break;
            case "generic_template": // -> to carousel template
                if (message.attachment.payload.elements.length > 6){
                    compiled_message = {
                        type: "text",
                        text: `*Message type is facebook's generic template. It exceeds the Viber's max elements threshold of 6.`
                    }
                    break;
                }

                compiled_message = {
                    type: 'rich_media',
                    min_api_version: 2,
                    rich_media: {
                        Type: 'rich_media',
                        ButtonsGroupColumns: 6,
                        ButtonsGroupRows: 6,
                        BgColor:'#FFFFFF',
                        Buttons: [],
                    }
                }
                for(let element of message.attachment.payload.elements){
                    if(element.image_url){
                        compiled_message.rich_media.Buttons.push({
                            Columns: 6, Rows: 1, Silent: true, ActionType: 'none',
                            Image: element.image_url
                        });
                    } else {
                        compiled_message.rich_media.Buttons.push({
                            Columns: 6, Rows: 1, Silent: true, ActionType: 'none',
                            Text: ' '
                        });
                    }
                    compiled_message.rich_media.Buttons.push({
                        Columns: 6, Rows: 1, Silent: true, ActionType: 'none',
                        TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'left',
                        Text: `<b>${element.title}</b>`
                    });
                    if(element.subtitle){
                        compiled_message.rich_media.Buttons.push({
                            Columns: 6, Rows: 1, Silent: true, ActionType: 'none',
                            TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'left',
                            Text: column.subtitle,
                        });
                    } else {
                        compiled_message.rich_media.Buttons.push({
                            Columns: 6, Rows: 1, Silent: true, ActionType: 'none',
                            Text: ' '
                        });
                    }
                    if(element.buttons){
                        let count_buttons = 0;
                        for(let button of element.buttons){
                            if(button.type === 'postback'){
                                compiled_message.rich_media.Buttons.push({
                                    Columns: 6, Rows: 1,
                                    Silent: true, ActionType: 'reply',
                                    ActionBody: button.payload,
                                    TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                                    Text: `<font color=#003399><b>${button.title}</b></font>`,
                                });
                            } else if(button.type === 'web_url'){
                                compiled_message.rich_media.Buttons.push({
                                    Columns: 6, Rows: 1,
                                    Silent: false,
                                    ActionType: 'open-url', ActionBody: button.url,
                                    TextSize: 'large', TextVAlign: 'middle', TextHAlign: 'center',
                                    Text: `<font color=#003399><b>${button.title}</b></font>`,
                                });
                            } else {
                                debug(`Compiling template messege including ${button.type} button from facebook format to viber format is not supported since viber does not have corresponding template.`);
                                compiled_message = {
                                    type: "text",
                                    text: `*Compiling template messege including ${button.type} button from facebook format to viber format is not supported since viber does not have corresponding template.`
                                }
                                break;
                            }
                            count_buttons++;
                        }
                        for(let i = count_buttons;i < 3;i++){
                            compiled_message.rich_media.Buttons.push({
                                Columns: 6, Rows: 1,
                                Silent: true, ActionType: 'none',
                                Text: ' ',
                            });
                        }
                    } else {
                        for(let i = 0;i < 3;i++){
                            compiled_message.rich_media.Buttons.push({
                                Columns: 6, Rows: 1,
                                Silent: true, ActionType: 'none',
                                Text: ' ',
                            });
                        }
                    }
                }
                break;
            case "list_template":
            case 'open_graph':
            case 'receipt':
            case 'airline_boardingpass':
            case 'airline_checkin':
            case 'airline_itinerary':
            case 'airline_update':
            default:
                debug(`Message type is Facebook's ${message_type} and it is not supported in Viber.`);
                compiled_message = {
                    type: 'text',
                    text: `*Message type is facebook's ${message_type} and it is not supported in Viber.`
                }
                break;
        }
        return compiled_message;
    }

    static translate_message(translater, message_type, message, sender_language){
        return Promise.resolve(message);
    }
}
