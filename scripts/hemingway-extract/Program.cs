using System.Text;
using CUE4Parse.Encryption.Aes;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Objects.Core.Misc;
using CUE4Parse.UE4.Versions;
using Newtonsoft.Json;

const string gameDir =
    @"C:\Program Files (x86)\Steam\steamapps\common\SMITE 2\Windows\Hemingway";
const string paksDir = Path.Combine(gameDir, "Content", "Paks");
    @"C:\Users\Carri\Downloads\Output\.data\5.5.4-1598479-Hemingway.usmap";
const string outDir =
    @"C:\Users\Carri\Downloads\Output\Exports\Hemingway\_tier-scan";

var aesCandidates = new[]
{
    "0x3bfa9cc97da10598521b342961df8f5f68c7388fa117345eeb516eaa837bb4d6",
};

Directory.CreateDirectory(outDir);

var version = new VersionContainer(EGame.GAME_UE5_5);
using var provider = new DefaultFileProvider(paksDir, SearchOption.TopDirectoryOnly, true, version);
provider.MappingsContainer = new FileUsmapTypeMappingsProvider(usmapPath);

foreach (var keyHex in aesCandidates)
{
    try
    {
        provider.SubmitKey(new FGuid(), new FAesKey(keyHex));
    }
    catch (Exception ex)
    {
        Console.WriteLine($"AES submit failed for {keyHex}: {ex.Message}");
    }
}

provider.Initialize();
Console.WriteLine($"Unloaded VFS: {provider.UnloadedVfs.Count}");
foreach (var vfs in provider.UnloadedVfs)
    Console.WriteLine($"  unloaded: {vfs.Name} encrypted={vfs.IsEncrypted}");
Console.WriteLine($"Mounted archives: {provider.MountedVfs.Count}");
Console.WriteLine($"Files indexed: {provider.Files.Count}");

var targets = new[]
{
    "Hemingway/Content/Characters/GODS/Aladdin/Skin02/Aladdin_SkinItem_Skin02A",
    "Hemingway/Content/Monetization/Seasons/OB23/Aladdin/S_OB23_Aladdin_Yulefest",
    "Hemingway/Content/Monetization/Seasons/OB23/S_WM_OB23_Yulefest",
};

// Fallback: search file index for partial names
var indexHits = provider.Files.Keys
    .Where(k => k.Contains("Yulefest", StringComparison.OrdinalIgnoreCase)
                || k.Contains("Aladdin_SkinItem", StringComparison.OrdinalIgnoreCase)
                || k.Contains("SkinItem_Skin02A", StringComparison.OrdinalIgnoreCase))
    .Take(40)
    .ToList();

File.WriteAllText(
    Path.Combine(outDir, "_index-hits.json"),
    JsonConvert.SerializeObject(indexHits, Formatting.Indented));

foreach (var path in targets)
{
    TryExport(provider, path, outDir);
}

// Export a few skin items for comparison
foreach (var key in provider.Files.Keys
             .Where(k => k.Contains("_SkinItem_", StringComparison.OrdinalIgnoreCase)
                         && !k.Contains("/NPC_", StringComparison.OrdinalIgnoreCase))
             .Take(8))
{
    TryExport(provider, key.Replace(".uasset", ""), outDir);
}

static void TryExport(DefaultFileProvider provider, string objectPath, string outDir)
{
    try
    {
        var exports = provider.LoadAllObjects(objectPath);
        var safeName = objectPath.Replace('/', '_').Replace('\\', '_');
        var exportList = exports.ToList();
        var json = JsonConvert.SerializeObject(exportList, Formatting.Indented);
        var outPath = Path.Combine(outDir, safeName + ".json");
        File.WriteAllText(outPath, json, Encoding.UTF8);
        Console.WriteLine($"OK  {objectPath} -> {outPath} ({exportList.Count} exports)");

        foreach (var export in exportList)
        {
            if (export is not UObject uo) continue;
            var props = string.Join(", ", uo.Properties.Select(p => p.Name.Text));
            if (props.Length > 0)
                Console.WriteLine($"    props: {props}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERR {objectPath}: {ex.Message}");
    }
}
