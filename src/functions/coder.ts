import type { ChatCompletionFunctions } from 'openai';

const CoderFunction: ChatCompletionFunctions = {
    name: 'write_code',
    description:
        'Provide a code solution to the specified problem in the requested programming or scripting language, if the requested language is not provided use TypeScript',
    parameters: {
        type: 'object',
        properties: {
            code: {
                type: 'string',
                description: 'The code solution to the given problem that is ready to be copied to an IDE',
            },
        },
        required: ['code'],
    },
};

export default CoderFunction;
