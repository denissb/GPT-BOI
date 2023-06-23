import CoderFunction from './functions/coder.js';
import { code } from 'telegraf/format';
import type { ChatCompletionResponseMessage } from 'openai';

export function handleGPTResponse(response: ChatCompletionResponseMessage) {
    if (response.function_call) {
        const functionCall = response.function_call;
        switch (functionCall.name) {
            case CoderFunction.name:
                try {
                    // console.log(functionCall.arguments);
                    return parseCodeResponse(functionCall.arguments);
                } catch (e) {
                    throw e;
                }
            default:
                return '';
        }
    } else {
        return response.content || '';
    }
}

// This is the best I could come up with for trying to return a presentable response
// based on what ChatGPT can spit out as a response to a function call returning blocks of code
export function parseCodeResponse(data?: string) {
    if (data) {
        const startPrefixTypes = ['"code": "', '"code": `'];
        const prefixTypeIndex = data.indexOf(startPrefixTypes[0]) > 0 ? 0 : 1;
        const endPredicateTypes = ['"\n}', '`\n}'];
        const trimStart = data.indexOf(startPrefixTypes[prefixTypeIndex]) + startPrefixTypes[prefixTypeIndex].length;
        const trimEnd = data.lastIndexOf(endPredicateTypes[prefixTypeIndex]);
        const result = data.substring(trimStart, trimEnd);
        return code(result);
    }

    return '';
}
