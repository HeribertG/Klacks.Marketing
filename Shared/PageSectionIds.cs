// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Shared;

/// <summary>
/// DOM ids of the page sections that the site header links to ("/land-ch#regeln") or that other pages deep-link
/// into ("/land-ch/grosse-betriebe#ki-agenten"). The country start page and the industry pages both carry them, so a
/// header link works on either; each id may exist only once per page.
/// </summary>
public static class PageSectionIds
{
    public const string Industries = "branchen";
    public const string Solutions = "kontrolle";
    public const string Rules = "regeln";
    public const string Klacksy = "klacksy";
    public const string Download = "download";
    public const string Agents = "ki-agenten";
}
