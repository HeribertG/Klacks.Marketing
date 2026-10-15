// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// Names of the AI model providers Klacks connects to out of the box (Klacks.Api LLMProviderFactory: openai, anthropic,
/// google, azure, mistral, deepseek; any other provider id uses the OpenAI-compatible client, e.g. a model on the
/// customer's own server). Shown as plain names on the simple start page; logos only after each provider's trademark
/// guidelines were checked (spec §8.5).
/// </summary>
public static class KlacksyModelProviders
{
    public static readonly IReadOnlyList<string> Names = new[]
    {
        "OpenAI", "Anthropic", "Google Gemini", "Microsoft Azure OpenAI", "Mistral AI", "DeepSeek",
    };
}
