using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;
using System.Linq;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Seraline.Utilities;
using System.Text;
using System.Web;
using System.IO;

namespace PaintingsILove.Models
{
    public partial class PaintingsILoveDataContext : System.Data.Linq.DataContext
    {
        public XElement GenerateTitles(int count)
        {
            var titles = new XElement("Titles");

            var rand = new Random();

            var dbProbs = GetProbsFromDatabase();

            StringBuilder sb = new StringBuilder(10000);

            for (int i = 0; i < count; i++)
            {
                var title = GenerateTitle(dbProbs, rand);

                titles.Add(new XElement("Title", new XAttribute("Id", i), title));

            }

            return titles;
        }

        public Dictionary<string, List<KeyValuePair<string, double>>> GetProbsFromDatabase()
        {
            var english = new string[] { "Australia", "United Kindgom", "United States", "New Zealand", "Ireland", "Canada", "Germany", "Netherlands", "Italy" };
            var ignore = new string[] { "untitled", "canvas", "paper", "plein", "title", "nfs", "sale", "mdf", "acrylic", "watercolour", "watercolor", "sold", "sketch", "drawing", "painting", "fuck", "god", "jesus", "christ", "islam", "mohammed", "abortion" };
            var twoletterwords = new string[] { "ah", "am", "an", "as", "at", "be", "by", "do", "eh", "ex", "go", "ha", "he", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we" };

            var text = Images.Where(i => i.CurrentScore >= 0 && english.Contains(i.User.Country)).Select(i => i.Title).Distinct().ToList();

            var dic = new Dictionary<string, Dictionary<string, int>>();

            foreach (var line in text)
            {
                var words = Regex.Split(line.ToLower(), @"\b");

                var c1 = "^";

                foreach (var word in words)
                {
                    if (word.Trim().Length > 0 && word.ToCharArray().All(c => c >= 'a' && c <= 'z') && !ignore.Contains(word))
                    {
                        if (word.Length > 1 || word == "a")
                        {
                            if (word.Length > 2 || twoletterwords.Contains(word))
                            {
                                UpdateDic(dic, c1, word);

                                c1 = word;
                            }
                        }
                    }
                }

                UpdateDic(dic, c1, "$");
            }

            var dbProbs = new Dictionary<string, List<KeyValuePair<string, double>>>();

            foreach (var w1 in dic.Keys)
            {
                var probs = new List<KeyValuePair<string, double>>();

                dbProbs[w1] = probs;

                double followers = (double)dic[w1].Sum(w => w.Value);
                double cumprob = 0.0;

                foreach (var w2 in dic[w1].OrderBy(w => w.Value))
                {
                    var prob = (double)(dic[w1])[w2.Key] / followers;

                    cumprob += prob;

                    probs.Add(new KeyValuePair<string, double>(w2.Key, cumprob));
                }
            }

            return dbProbs;
        }

        public void UpdateDic(Dictionary<string, Dictionary<string, int>> dic, string c1, string c2)
        {
            Dictionary<string, int> db2;

            if (dic.ContainsKey(c1))
            {
                db2 = dic[c1];
            }
            else
            {
                db2 = new Dictionary<string, int>();
                dic[c1] = db2;
            }

            if (db2.ContainsKey(c2))
            {
                db2[c2] += 1;
            }
            else
            {
                db2[c2] = 1;
            }
        }

        public string GenerateTitle(Dictionary<string, List<KeyValuePair<string, double>>> dbProbs, Random rand)
        {
            string sentence = "";

            bool accept = false;

            do
            {
                StringBuilder sb = new StringBuilder(20);

                var wordCount = 0;

                var w1 = "^";

                do
                {
                    var db2 = dbProbs[w1];

                    var prob = rand.NextDouble();

                    foreach (var wp in db2)
                    {
                        if (wp.Value > prob)
                        {
                            w1 = wp.Key;

                            if (w1 != "$")
                            {
                                if (wordCount > 0)
                                    sb.Append(" ");

                                sb.Append(w1);
                                wordCount++;
                            }

                            break;
                        }
                    }

                } while (w1 != "$");

                sentence = sb.ToString();

                accept = (wordCount >= 4);

            } while (!accept);

            return sentence;
        }

        public static void UpdateGeneratedTitles(XElement data)
        {
            PaintingsILoveDataContext db = new PaintingsILoveDataContext(PaintingsILoveDataContext.ConnectionString);

            /*
                <Titles>
                  <Title Id="0">lady in front of music</Title>
                  <Title Id="1">lady of the love and unadulterated joy</Title>
                  <Title Id="2">into the last day</Title>
                  <Title Id="3">colour in shadows structure</Title>
                </Titles>
             */

            try
            {
                foreach (var item in data.Elements("Title"))
                {
                    var titleId = int.Parse(item.Attribute("Id").Value);

                    var title = db.GeneratedTitles.SingleOrDefault(i => i.TitleId == titleId);

                    if (title == null)
                    {
                        title = new GeneratedTitle() { TitleId = titleId };
                        db.GeneratedTitles.InsertOnSubmit(title);
                    }

                    title.Title = item.Value;
                }

                db.SubmitChanges();

                Utils.Log("=== UpdateGeneratedTitles done");
            }
            catch (Exception ex)
            {
                Utils.Log("=== UpdateGeneratedTitles Error: " + ex.Message);

            }
        }


    }
}
