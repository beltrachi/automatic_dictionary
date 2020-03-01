#!/usr/bin/env ruby

# For each language
dirs = `find * -type d`.split(/\s+/)

def parse_properties_file(path)
  lines = File.open(path).read.split("\n")
  lines.inject({}) do |acc, line|
    parts = line.split('=')
    key = parts.shift
    acc[key] = parts.join('=')
    acc
  end
end

def parse_dtd(file_path)
  lines = File.open(file_path).read.split("\n")
  out = {}
  tags = []
  lines.each do |line|
    puts "Evaluant #{line}"
    if line.start_with? '<!ENTITY '
      puts "creant tag nou"
      tags << line
    else
      puts "concatenant..."
      tags[tags.size - 1] = tags.last + "\n" + line
    end
  end
  require 'pp'
  pp tags
  tags.each do |tag|
    puts "Tag is #{tag}"
    match = tag.match(/^<!ENTITY ([^\s]+)\s+"(.*)">/m)
    pp match
    out[match[1]] = match[2]
  end
  out
end

def write_file(lang, data)
  structure = {}
  data.each do |key, value|
    structure[key] = {message: value, description: key}
  end
  File.open("./#{lang}/messages.json",'w') do |file|
    file.write(JSON.pretty_generate(structure))
  end
end
require 'json'
dirs.each do |dir|
  puts "Converting language #{dir}"

  data = parse_properties_file("./#{dir}/strings.properties")
  puts data.inspect

  data.merge!(parse_dtd("./#{dir}/preferences.dtd"))

  write_file(dir, data)
end