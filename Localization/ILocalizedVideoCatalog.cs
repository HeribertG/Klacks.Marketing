// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

namespace Klacks.Marketing.Localization;

public interface ILocalizedVideoCatalog
{
    LocalizedVideoSources? Find(string videoName, string culture);
}
