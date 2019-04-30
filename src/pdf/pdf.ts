import * as pdfmaker from "./pdfmaker";
import * as print from "./print";
import { FountainConfig } from "../configloader";
import * as helpers from "../helpers";
var fliner = require("aw-liner");

export var GeneratePdf = function(outputpath:string, config:FountainConfig, parsedDocument:any, callback:any){
    var liner = new fliner.Liner(helpers.default);

    var watermark = undefined;
    var font = "Courier Prime";
    for (let index = 0; index < parsedDocument.title_page.length; index++) {
        if(parsedDocument.title_page[index].type=="watermark")
            watermark = parsedDocument.title_page[index].text;
        if(parsedDocument.title_page[index].type=="font")
            font = parsedDocument.title_page[index].text;
    }
    var current_index = 0, previous_type:string = null;
    // tidy up separators
    while (current_index < parsedDocument.tokens.length) {
        var current_token = parsedDocument.tokens[current_index];

        if (current_token.type == "dual_dialogue_begin" || current_token.type == "dialogue_begin" || current_token.type == "dialogue_end" || current_token.type == "dual_dialogue_end" ||
            (!config.print_actions && current_token.is("action", "transition", "centered", "shot")) ||
            (!config.print_notes && current_token.type === "note") ||
            (!config.print_headers && current_token.type === "scene_heading") ||
            (!config.print_sections && current_token.type === "section") ||
            (!config.print_synopsis && current_token.type === "synopsis") ||
            (!config.print_dialogues && current_token.is_dialogue()) ||
            (config.merge_empty_lines && current_token.is("separator") && previous_type === "separator")) {

            parsedDocument.tokens.splice(current_index, 1);
            continue;
        }

        if (config.double_space_between_scenes && current_token.is("scene_heading") && current_token.number !== 1) {
            var additional_separator = helpers.default.create_separator(parsedDocument.tokens[current_index].start, parsedDocument.tokens[current_index].end);
            parsedDocument.tokens.splice(current_index, 0, additional_separator);
            current_index++;
        }
        previous_type = current_token.type;
        current_index++;
    }

    // clean separators at the end
    while (parsedDocument.tokens.length > 0 && parsedDocument.tokens[parsedDocument.tokens.length - 1].type === "separator") {
        parsedDocument.tokens.pop();
    }

    if(config.print_watermark == "" && watermark!=undefined)
        config.print_watermark = watermark;
    parsedDocument.lines = liner.line(parsedDocument.tokens, {
        print: print.print_profiles[config.print_profile],
        text_more: "(MORE)",
        text_contd: "(CONT'D)",
        split_dialogue: true
    });

    var pdf_options:pdfmaker.Options = {
        filepath: outputpath,
        parsed: parsedDocument,
        print:print.print_profiles[config.print_profile],
        callback:function(output:any){
            callback(output);
        },
        config:config,
        font:font
    }
    try {
        pdfmaker.get_pdf(pdf_options);
    } catch (error) {
        callback(error);
    }
    
}
