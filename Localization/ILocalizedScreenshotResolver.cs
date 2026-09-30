// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

public interface ILocalizedScreenshotResolver
{
    string Resolve(string file, string culture);

    bool IsLocalized(string file, string culture);
}
