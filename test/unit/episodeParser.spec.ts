// ensures the third party module is doing what we expect in our context.
import * as episodeParser from 'episode-parser';

describe('TV Series parsing', () => {
  it('should parse common episode and season from filenames', () => {
    let title = 'Dora.The.Explorer.S03E19.The.Super.Silly.Fiesta.480p.AMZN.WEBRip.DD2.0.x264-AR.avi';
    let result = episodeParser(title);
    expect(result.season).toEqual(3);
    expect(result.episode).toEqual(19);
    expect(result.show).toEqual('Dora The Explorer');

    title = 'My.Cat.From.Hell.S10E12.Phillys.Forgotten.Cats.WEB.x264-CAFFEiNE[eztv].mkv';
    result = episodeParser(title);
    expect(result.season).toEqual(10);
    expect(result.episode).toEqual(12);
    expect(result.show).toEqual('My Cat From Hell');

    title = 'Game.of.Thrones.S08E06.1080p.AMZN.WEB-DL.x264-MkvCage.ws.mkv';
    result = episodeParser(title);
    expect(result.season).toEqual(8);
    expect(result.episode).toEqual(6);
    expect(result.show).toEqual('Game of Thrones');

    title = 'Prison.Break.S05E05.HDTV.x264-KILLERS[ettv].mkv';
    result = episodeParser(title);
    expect(result.season).toEqual(5);
    expect(result.episode).toEqual(5);
    expect(result.show).toEqual('Prison Break');
  });
});
