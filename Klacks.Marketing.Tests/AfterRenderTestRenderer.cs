// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Tests;

using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Renderer that, unlike the static HtmlRenderer, runs OnAfterRenderAsync like an interactive Blazor Server circuit and
/// records every exception that would terminate the circuit.
/// </summary>
/// <param name="services">Services of the rendered component tree</param>
internal sealed class AfterRenderTestRenderer(IServiceProvider services) : Renderer(services, NullLoggerFactory.Instance)
{
    public List<Exception> CircuitExceptions { get; } = [];

    public override Dispatcher Dispatcher { get; } = Dispatcher.CreateDefault();

    public async Task RenderAsync<TComponent>(IDictionary<string, object?> parameters)
        where TComponent : IComponent
    {
        await Dispatcher.InvokeAsync(async () =>
        {
            var componentId = AssignRootComponentId(InstantiateComponent(typeof(TComponent)));
            await RenderRootComponentAsync(componentId, ParameterView.FromDictionary(parameters));
        });
    }

    protected override void HandleException(Exception exception) => CircuitExceptions.Add(exception);

    protected override Task UpdateDisplayAsync(in RenderBatch renderBatch) => Task.CompletedTask;
}
